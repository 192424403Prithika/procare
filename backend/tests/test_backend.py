import os
import sys
import pytest
from fastapi.testclient import TestClient

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.main import app
from app.core.security import hash_password, verify_password, create_access_token, decode_token
from app.core.rbac import UserRole
from app.services.weather_service import calculate_magnus_dew_point, evaluate_condensation_risk
from app.services.triage_service import compute_explainable_risk_assessment
from app.services.pdf_service import generate_inspection_pdf
from app.core.storage import generate_signed_token, verify_signed_token

client = TestClient(app)

def test_root_endpoint():
    """Test root status endpoint returns operational status and engine versions."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "operational"
    assert "opencv" in data["engines"]
    assert "scipy" in data["engines"]

def test_health_check_endpoint():
    """Test healthcheck endpoint."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data

def test_password_hashing():
    """Test Argon2 password hashing and verification."""
    raw_pwd = "SuperSecretPassword2026!"
    hashed = hash_password(raw_pwd)
    assert hashed != raw_pwd
    assert hashed.startswith("$argon2")
    assert verify_password(raw_pwd, hashed) is True
    assert verify_password("WrongPassword!", hashed) is False

def test_jwt_lifecycle():
    """Test JWT access token issuance and signature validation."""
    sub = "user_test_123"
    role = UserRole.MANAGER
    token = create_access_token(subject=sub, role=role)
    assert isinstance(token, str)
    
    decoded = decode_token(token)
    assert decoded["sub"] == sub
    assert decoded["role"] == role
    assert decoded["type"] == "access"

def test_storage_signed_token():
    """Test HMAC signed token generation and expiry verification."""
    bucket = "inspection-images"
    path = "inspection-images/sample.jpg"
    sig, expires = generate_signed_token(bucket, path, expires_in_seconds=3600)
    assert verify_signed_token(bucket, path, expires, sig) is True
    assert verify_signed_token("other-bucket", path, expires, sig) is False
    assert verify_signed_token(bucket, path, expires - 4000, sig) is False

def test_optical_engine_health():
    """Test OpenCV optical engine health endpoint."""
    response = client.get("/api/v1/analyze/moisture/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "online"
    assert data["features"]["single_and_dual_frame"] is True

def test_acoustic_engine_health():
    """Test SciPy acoustic engine health endpoint."""
    response = client.get("/api/v1/analyze/acoustic/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "online"
    assert data["features"]["welch_psd"] is True

def test_magnus_dew_point():
    """Test Magnus-Tetens psychrometric calculation."""
    # At 20°C and 50% RH, dew point is approximately 9.3°C
    dp = calculate_magnus_dew_point(20.0, 50.0)
    assert 8.5 < dp < 10.5
    
    # At 100% RH, dew point equals dry-bulb temperature
    dp_sat = calculate_magnus_dew_point(15.0, 100.0)
    assert abs(dp_sat - 15.0) < 0.2

    # Condensation risk
    risk = evaluate_condensation_risk(12.0, 11.5)
    assert risk["risk"] == "Severe"

def test_explainable_triage():
    """Test explainable risk score calculation."""
    prop = {"build_year": 1974}
    res = compute_explainable_risk_assessment(
        property_data=prop,
        optical_difference_pct=42.0,
        acoustic_frequency_hz=1250.0,
        acoustic_score=85.0,
        dew_point_margin_c=0.6,
    )
    assert res["risk_category"] in ["critical", "high"]
    assert 60 <= res["risk_score"] <= 100
    assert len(res["factors"]) == 4
    assert len(res["recommendations"]) > 0

def test_pdf_generation():
    """Test ReportLab PDF report generation."""
    prop = {
        "property_name": "Test Estate Block A",
        "building_type": "Multi-Storey",
        "address": "12 High St",
        "postal_code": "M1 1AA",
        "build_year": 1985,
        "risk_level": "critical",
        "risk_score": 85,
    }
    pdf_bytes = generate_inspection_pdf(property_data=prop)
    assert len(pdf_bytes) > 1000
    assert pdf_bytes.startswith(b"%PDF")
