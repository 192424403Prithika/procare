import pytest
import numpy as np
import cv2
from fastapi.testclient import TestClient
from app.main import app
from app.services.image_processing import encode_image_to_base64_data_uri
from app.services.image_defect_detector import detect_visual_defects
from app.services.image_comparison import compare_inspection_images
from app.routers.qr import generate_property_qr_token, verify_property_qr_token

client = TestClient(app)

def create_synthetic_test_image(defect: str = "crack") -> str:
    """Creates a high quality synthetic image to test CV algorithms without requiring external files."""
    canvas = np.ones((400, 500, 3), dtype=np.uint8) * 180  # Light plaster wall
    # Add substrate plaster texture so sharpness / Laplacian check passes
    noise = np.random.normal(0, 10, canvas.shape).astype(np.int16)
    canvas = np.clip(canvas.astype(np.int16) + noise, 0, 255).astype(np.uint8)

    if defect == "crack":
        # Draw a jagged black crack line across the wall
        pts = np.array([[120, 80], [150, 140], [160, 210], [175, 290], [190, 360]], np.int32)
        cv2.polylines(canvas, [pts], False, (30, 30, 30), 2)
    elif defect == "stain":
        # Draw a yellowish-brown water stain ellipse
        cv2.ellipse(canvas, (250, 200), (90, 60), 10, 0, 360, (60, 120, 150), -1)
    elif defect == "mould":
        # Draw a dark stippled cluster
        cv2.ellipse(canvas, (200, 180), (60, 45), 25, 0, 360, (20, 20, 20), -1)
        cv2.circle(canvas, (230, 210), 25, (25, 25, 25), -1)

    return encode_image_to_base64_data_uri(canvas, format_ext="jpg")

def test_feature1_digital_twin_defaults():
    resp = client.get("/api/v1/forecast/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "online"

def test_feature2_predictive_forecasting():
    payload = {
        "property_id": "PROP-0914",
        "property_name": "Trinity Court Blocks A-C",
        "construction_year": 1974,
        "building_type": "Multi-Storey Social Housing",
        "pipe_type": "Copper",
        "roof_age_years": 12,
        "current_risk_score": 75,
        "dew_point_margin_c": 0.8,
        "has_acoustic_anomaly": True,
    }
    resp = client.post("/api/v1/forecast/property", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["property_id"] == "PROP-0914"
    assert "quarters" in data
    assert len(data["quarters"]) == 20
    assert "components" in data
    assert data["reactive_failure_cost"] > data["proactive_cost_estimate"]

def test_feature4_multi_defect_image_detection():
    img_b64 = create_synthetic_test_image("crack")
    result = detect_visual_defects(img_b64)
    assert result.analysis_id.startswith("OPCV-DEFECT-")
    assert len(result.detected_defects) > 0
    assert any(d.category == "wall_crack" for d in result.detected_defects)
    assert "Statutory Scientific Disclosure" in result.statutory_advisory

def test_feature5_damage_comparison():
    img_before = create_synthetic_test_image("stain")
    # After image has the stain remediated
    img_after = create_synthetic_test_image("clean")
    res = compare_inspection_images(
        previous_input=img_before,
        current_input=img_after,
        property_id="PROP-TEST",
        inspection_zone="Master Bedroom Ceiling",
    )
    assert res.comparison_id.startswith("CMP-")
    assert res.change_status in ["improvement", "deterioration", "no_significant_change"]
    assert res.change_percentage >= 0.0
    assert res.difference_heatmap_url.startswith("data:image/jpeg;base64,")

def test_feature7_cost_estimator():
    payload = {
        "defect_category": "pipe_leak",
        "severity": "critical",
        "area_sqm": 8.0,
        "urgency": "Emergency 24h",
    }
    # Direct check of rules & rates calculation logic
    from app.routers.cost_estimator import TRADE_COST_RULES
    assert "pipe_leak" in TRADE_COST_RULES
    assert TRADE_COST_RULES["pipe_leak"]["base_rate"] == 65.0

def test_feature9_qr_token_cryptography():
    prop_id = "PROP-0914"
    token = generate_property_qr_token(prop_id)
    assert token.startswith("PROP-0914.")
    # Verify valid token
    resolved_id = verify_property_qr_token(token)
    assert resolved_id == prop_id

    # Tampered token should raise ValueError
    tampered = token[:-4] + "XXXX"
    with pytest.raises(ValueError):
        verify_property_qr_token(tampered)
