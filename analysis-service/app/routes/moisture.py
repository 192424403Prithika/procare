from fastapi import APIRouter, HTTPException, UploadFile, File, Form, status
from typing import Optional
import cv2

from app.schemas.moisture import (
    MoistureAnalysisRequest,
    MoistureAnalysisResponse,
)
from app.services.image_processing import process_moisture_analysis

router = APIRouter(prefix="/api/v1/analyze/moisture", tags=["Moisture Optical Analysis"])

@router.get("/health")
def moisture_engine_health():
    """Healthcheck endpoint for OpenCV moisture optical diagnostic engine."""
    has_sift = hasattr(cv2, "SIFT_create")
    return {
        "status": "online",
        "service": "PropCare NW Optical Analysis Engine",
        "opencv_version": cv2.__version__,
        "features": {
            "sift_available": has_sift,
            "flann_matcher": True,
            "clahe_exposure_norm": True,
            "connected_components": True,
            "single_and_dual_frame": True,
        },
    }

@router.post("", response_model=MoistureAnalysisResponse)
async def analyze_moisture_json(payload: MoistureAnalysisRequest):
    """
    Executes OpenCV moisture and surface defect analysis on actual photograph inputs.
    Detects water stains, discoloration, peeling paint, and specular flash sheen.
    """
    try:
        response = process_moisture_analysis(
            ambient_input=payload.ambient_image,
            flash_input=payload.flash_image,
            report_id=payload.report_id,
            sensitivity=payload.sensitivity or 0.5,
        )
        return response
    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(ve),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Image processing pipeline failure: {str(e)}",
        )

@router.post("/upload", response_model=MoistureAnalysisResponse)
async def analyze_moisture_upload(
    ambient_file: UploadFile = File(..., description="Primary inspection image file"),
    flash_file: Optional[UploadFile] = File(None, description="Optional on-axis flash photo for dual-frame analysis"),
    report_id: Optional[str] = Form(None),
    sensitivity: Optional[float] = Form(0.5),
):
    """
    Executes OpenCV moisture analysis from direct multipart/form-data file uploads.
    """
    try:
        ambient_bytes = await ambient_file.read()
        if len(ambient_bytes) == 0:
            raise HTTPException(status_code=400, detail="Primary inspection image file is empty.")

        flash_bytes = None
        if flash_file is not None:
            raw_flash = await flash_file.read()
            if len(raw_flash) > 0:
                flash_bytes = raw_flash

        response = process_moisture_analysis(
            ambient_input=ambient_bytes,
            flash_input=flash_bytes,
            report_id=report_id,
            sensitivity=float(sensitivity or 0.5),
        )
        return response
    except HTTPException:
        raise
    except ValueError as ve:
        raise HTTPException(status_code=422, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Image processing failure: {str(e)}")
