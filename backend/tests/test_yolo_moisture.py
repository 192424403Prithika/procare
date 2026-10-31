import os
import sys
import io
import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.main import app
from app.core.security import create_access_token
from app.core.rbac import UserRole, get_current_user
from app.services.yolo_moisture_service import get_yolo_detector, DefectDetection, BoundingBox

client = TestClient(app)

@pytest.fixture
def mock_inspector_user():
    user = {
        "_id": "6723a1000000000000000004",
        "id": "6723a1000000000000000004",
        "email": "inspector@propcare.gov.uk",
        "role": UserRole.INSPECTOR,
        "full_name": "Field Building Inspector",
        "is_active": True,
    }
    app.dependency_overrides[get_current_user] = lambda: user
    yield user
    app.dependency_overrides.pop(get_current_user, None)

@pytest.fixture
def inspector_headers(mock_inspector_user):
    token = create_access_token(subject=mock_inspector_user["id"], role=UserRole.INSPECTOR)
    return {"Authorization": f"Bearer {token}"}

def test_yolo_model_status_endpoint(inspector_headers):
    """Test model status endpoint returns configuration, classes, and instructions."""
    response = client.get("/api/v1/analysis/moisture/model/status", headers=inspector_headers)
    assert response.status_code == 200
    data = response.json()
    assert "configured" in data
    assert "weights_path" in data
    assert "classes" in data
    assert len(data["classes"]) == 8
    assert "water_stain" in data["classes"][0]
    assert "visible_mould" in [c.split(":")[0] for c in data["classes"]]

def test_yolo_compat_status_endpoint(inspector_headers):
    """Test compatibility route alias /api/analysis/moisture/model/status."""
    response = client.get("/api/analysis/moisture/model/status", headers=inspector_headers)
    assert response.status_code == 200
    data = response.json()
    assert "configured" in data

def test_yolo_unconfigured_detection_response(inspector_headers):
    """
    When weights are not configured, detect endpoint must return unconfigured status
    with a clear message and NEVER fabricate fake detections.
    """
    # Create synthetic test image
    import numpy as np
    import cv2
    img = np.zeros((300, 300, 3), dtype=np.uint8)
    _, img_encoded = cv2.imencode(".jpg", img)

    files = {"file": ("test_wall.jpg", io.BytesIO(img_encoded.tobytes()), "image/jpeg")}
    data = {"inspection_id": "INSP-TEST-999", "property_id": "PROP-TEST-001"}

    response = client.post(
        "/api/v1/analysis/moisture/detect",
        headers=inspector_headers,
        files=files,
        data=data,
    )
    assert response.status_code == 200
    res = response.json()
    assert "result_id" in res
    assert res["status"] in ["unconfigured", "completed"]
    if not res["model_configured"]:
        assert res["total_defects"] == 0
        assert res["detections"] == []
        assert "Moisture detection model is not configured" in res["message"]

    # Verify retrieval by inspection_id
    retrieval_res = client.get(
        f"/api/v1/analysis/moisture/{res['inspection_id']}",
        headers=inspector_headers,
    )
    assert retrieval_res.status_code == 200
    history = retrieval_res.json()
    assert len(history) >= 1
    assert history[0]["result_id"] == res["result_id"]

    # Verify retrieval by result_id
    single_res = client.get(
        f"/api/v1/analysis/moisture/result/{res['result_id']}",
        headers=inspector_headers,
    )
    assert single_res.status_code == 200
    assert single_res.json()["result_id"] == res["result_id"]

def test_yolo_unsupported_file_extension(inspector_headers):
    """Detect endpoint must reject non-image file formats."""
    files = {"file": ("malicious.exe", io.BytesIO(b"binary data"), "application/x-msdownload")}
    response = client.post(
        "/api/v1/analysis/moisture/detect",
        headers=inspector_headers,
        files=files,
    )
    assert response.status_code == 415
    assert "Unsupported image file extension" in response.json()["detail"]

def test_yolo_detection_as_manager():
    """Verify that managers can also execute moisture detection without permission error."""
    manager_user = {
        "_id": "6723a1000000000000000003",
        "id": "6723a1000000000000000003",
        "email": "manager@propcare.gov.uk",
        "role": UserRole.MANAGER,
        "full_name": "Housing Operations Manager",
        "is_active": True,
    }
    app.dependency_overrides[get_current_user] = lambda: manager_user
    token = create_access_token(subject=manager_user["id"], role=UserRole.MANAGER)
    headers = {"Authorization": f"Bearer {token}"}

    import numpy as np
    import cv2
    img = np.zeros((200, 200, 3), dtype=np.uint8)
    _, encoded = cv2.imencode(".png", img)

    files = {"file": ("manager_wall.png", io.BytesIO(encoded.tobytes()), "image/png")}
    response = client.post(
        "/api/v1/analysis/moisture/detect",
        headers=headers,
        files=files,
    )
    assert response.status_code == 200
    assert response.json()["status"] in ["unconfigured", "completed"]
    app.dependency_overrides.pop(get_current_user, None)

def test_yolo_unauthenticated_access():
    """Unauthenticated access to protected detect endpoint must be rejected with 401."""
    app.dependency_overrides.pop(get_current_user, None)
    response = client.post("/api/v1/analysis/moisture/detect")
    assert response.status_code == 401

def test_moisture_risk_assessment_rules():
    """Verify explainable risk classification logic."""
    detector = get_yolo_detector()

    # Case 1: Empty detections -> low risk
    risk_class, score, rationale, rec = detector._evaluate_moisture_risk([], 0.0)
    assert risk_class == "low"
    assert "Standard cyclical maintenance" in rec

    # Case 2: Visible mould detected -> critical statutory triage
    mould_defect = DefectDetection(
        class_id=5,
        class_name="visible_mould",
        label="Visible Mould-Like Growth",
        confidence=0.89,
        bbox=BoundingBox(x1=10, y1=10, x2=80, y2=80, width=70, height=70),
        area_percentage=4.5,
        severity="critical",
    )
    risk_class, score, rationale, rec = detector._evaluate_moisture_risk([mould_defect], 4.5)
    assert risk_class == "critical"
    assert score >= 80.0
    assert "Awaab's Law Section 10A" in rec
    assert any("mould" in r.lower() for r in rationale)

    # Case 3: Wall moisture damage -> high priority
    wall_defect = DefectDetection(
        class_id=2,
        class_name="wall_moisture_damage",
        label="Wall Moisture Damage",
        confidence=0.78,
        bbox=BoundingBox(x1=20, y1=20, x2=150, y2=150, width=130, height=130),
        area_percentage=12.0,
        severity="high",
    )
    risk_class, score, rationale, rec = detector._evaluate_moisture_risk([wall_defect], 12.0)
    assert risk_class in ["high", "critical"]
    assert "calibrated protimeter" in rec
