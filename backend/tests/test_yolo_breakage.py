import os
import sys
import io
import pytest
import numpy as np
import cv2
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.main import app
from app.core.security import create_access_token
from app.core.rbac import UserRole, get_current_user
from app.services.yolo_breakage_service import (
    get_breakage_detector,
    BreakageBoundingBox,
    BreakageDefectDetection,
    BREAKAGE_DEFECT_CLASSES,
)

client = TestClient(app)

@pytest.fixture
def mock_inspector_user():
    user = {
        "_id": "6723a1000000000000000004",
        "id": "6723a1000000000000000004",
        "email": "inspector@propcare.gov.uk",
        "role": UserRole.INSPECTOR,
        "full_name": "Field Structural Inspector",
        "is_active": True,
    }
    app.dependency_overrides[get_current_user] = lambda: user
    yield user
    app.dependency_overrides.pop(get_current_user, None)

@pytest.fixture
def mock_manager_user():
    user = {
        "_id": "6723a1000000000000000002",
        "id": "6723a1000000000000000002",
        "email": "manager@propcare.gov.uk",
        "role": UserRole.MANAGER,
        "full_name": "Regional Housing Manager",
        "is_active": True,
    }
    app.dependency_overrides[get_current_user] = lambda: user
    yield user
    app.dependency_overrides.pop(get_current_user, None)

@pytest.fixture
def inspector_headers(mock_inspector_user):
    token = create_access_token(subject=mock_inspector_user["id"], role=UserRole.INSPECTOR)
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture
def manager_headers(mock_manager_user):
    token = create_access_token(subject=mock_manager_user["id"], role=UserRole.MANAGER)
    return {"Authorization": f"Bearer {token}"}

def make_test_image_bytes():
    """Generates a valid 400x400 JPEG image in memory."""
    img = np.full((400, 400, 3), 220, dtype=np.uint8)
    # Draw a simulated crack line
    cv2.line(img, (50, 50), (350, 350), (30, 30, 30), 3)
    _, buffer = cv2.imencode(".jpg", img)
    return io.BytesIO(buffer.tobytes())


def test_breakage_model_status_endpoint(inspector_headers):
    """Test model status endpoint returns configuration, classes, and honest instructions."""
    response = client.get("/api/v1/analysis/breakage/model-status", headers=inspector_headers)
    assert response.status_code == 200
    data = response.json()
    assert "configured" in data
    assert "weights_path" in data
    assert "classes" in data
    assert len(data["classes"]) == 12
    assert "wall_crack" in data["classes"][0]
    assert "structural_fracture" in [c.split(":")[0] for c in data["classes"]]
    assert "concrete_spalling" in [c.split(":")[0] for c in data["classes"]]
    assert "exposed_rebar" in [c.split(":")[0] for c in data["classes"]]


def test_breakage_compat_status_endpoint(inspector_headers):
    """Test compatibility route alias /api/analysis/breakage/model-status."""
    response = client.get("/api/analysis/breakage/model-status", headers=inspector_headers)
    assert response.status_code == 200
    data = response.json()
    assert "configured" in data


def test_breakage_file_validation_rejection(inspector_headers):
    """Detect endpoint must reject invalid file types with 400 Bad Request or 415 Unsupported Media Type."""
    files = {"file": ("document.txt", io.BytesIO(b"Hello world, not an image"), "text/plain")}
    response = client.post("/api/v1/analysis/breakage/detect", files=files, headers=inspector_headers)
    assert response.status_code in [400, 415]
    assert "Unsupported image file extension" in response.json()["detail"]


def test_breakage_unauthenticated_detect_rejected():
    """Endpoints requiring authentication must reject unauthenticated requests."""
    files = {"file": ("test.jpg", make_test_image_bytes(), "image/jpeg")}
    old_override = app.dependency_overrides.pop(get_current_user, None)
    try:
        response = client.post("/api/v1/analysis/breakage/detect", files=files)
        assert response.status_code in [401, 403]
    finally:
        if old_override:
            app.dependency_overrides[get_current_user] = old_override


def test_breakage_severity_classification_structural_rules():
    """
    Unit test explainable severity classifier:
    Suspected structural defects (fracture, spalling, exposed rebar) MUST flag structural_engineer_required = True
    and produce major or critical severity.
    """
    detector = get_breakage_detector()

    # Case 1: Cosmetic minor wall crack
    minor_bbox = BreakageBoundingBox(x1=10, y1=10, x2=50, y2=50, width=40, height=40)
    minor_det = BreakageDefectDetection(
        class_id=0,
        class_name="wall_crack",
        label="Wall Crack",
        confidence=0.55,
        bbox=minor_bbox,
        area_percentage=1.0,
        severity="minor",
        damage_type="cosmetic"
    )
    res_minor = detector.classify_breakage_severity([minor_det], total_area_pct=1.0)
    assert res_minor["severity_classification"] in ["minor", "moderate"]
    assert res_minor["structural_engineer_required"] is False

    # Case 2: Structural fracture
    struct_bbox = BreakageBoundingBox(x1=20, y1=20, x2=200, y2=200, width=180, height=180)
    struct_det = BreakageDefectDetection(
        class_id=2,
        class_name="structural_fracture",
        label="Structural Fracture",
        confidence=0.72,
        bbox=struct_bbox,
        area_percentage=12.0,
        severity="major",
        damage_type="structural"
    )
    res_struct = detector.classify_breakage_severity([struct_det], total_area_pct=12.0)
    assert res_struct["severity_classification"] in ["major", "critical"]
    assert res_struct["structural_engineer_required"] is True
    assert any("structural" in r.lower() for r in res_struct["severity_rationale"])
    assert "structural engineer" in res_struct["recommendation"].lower()

    # Case 3: Exposed reinforcement steel (Critical)
    rebar_det = BreakageDefectDetection(
        class_id=6,
        class_name="exposed_rebar",
        label="Exposed Reinforcement Steel",
        confidence=0.85,
        bbox=struct_bbox,
        area_percentage=15.0,
        severity="critical",
        damage_type="structural"
    )
    res_rebar = detector.classify_breakage_severity([rebar_det], total_area_pct=15.0)
    assert res_rebar["severity_classification"] == "critical"
    assert res_rebar["structural_engineer_required"] is True


def test_breakage_manager_access(manager_headers):
    """Manager role must be permitted to view model status and history."""
    response = client.get("/api/v1/analysis/breakage/model-status", headers=manager_headers)
    assert response.status_code == 200


def test_breakage_combined_inspection_endpoint(inspector_headers):
    """Combined endpoint must aggregate both moisture and breakage findings without fake scores."""
    response = client.get("/api/v1/analysis/breakage/combined/test-inspection-99", headers=inspector_headers)
    assert response.status_code == 200
    data = response.json()
    assert "inspection_id" in data
    assert "combined_defect_count" in data
    assert "highest_severity" in data
    assert "combined_recommendation" in data
