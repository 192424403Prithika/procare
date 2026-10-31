import datetime
import os
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
import cv2

from app.core.database import get_db
from app.core.config import settings
from app.schemas.moisture import (
    MoistureAnalysisRequest,
    MoistureAnalysisResponse,
)
from app.services.image_processing import process_moisture_analysis

router = APIRouter(prefix="/api/v1/analyze/moisture", tags=["Optical Moisture Analysis"])

@router.get("/health")
def moisture_engine_health():
    """Healthcheck endpoint for OpenCV diagnostic optical engine."""
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
async def analyze_moisture_json(
    payload: MoistureAnalysisRequest,
    db = Depends(get_db),
):
    """
    Executes actual OpenCV optical difference analysis on base64, URL, or stored path imagery.
    Saves analysis findings in MongoDB 'image_analysis' collection.
    """
    try:
        response = process_moisture_analysis(
            ambient_input=payload.ambient_image,
            flash_input=payload.flash_image,
            report_id=payload.report_id,
            sensitivity=payload.sensitivity or 0.5,
        )

        # Persist analysis findings in MongoDB
        if db is not None:
            now_str = datetime.datetime.now(datetime.timezone.utc).isoformat()
            analysis_doc = {
                "report_id": payload.report_id,
                "property_id": payload.property_id,
                "processing_status": response.status,
                "is_suitable": response.is_suitable,
                "alignment_quality": response.alignment_quality,
                "difference_percentage": response.difference_percentage,
                "anomaly_count": response.anomaly_count,
                "result_summary": response.result_summary,
                "regions": [r.model_dump() for r in response.regions],
                "limitations": response.limitations,
                "execution_time_ms": response.execution_time_ms,
                "created_at": now_str,
            }
            await db.image_analysis.insert_one(analysis_doc)

            # Update corresponding inspection record if present
            if payload.report_id:
                await db.inspections.update_one(
                    {"_id": payload.report_id} if len(payload.report_id) == 24 else {"id": payload.report_id},
                    {
                        "$set": {
                            "ambient_moisture_index": response.difference_percentage,
                            "flash_reflection_score": round(response.alignment_quality, 1),
                            "updated_at": now_str,
                        }
                    }
                )

        return response
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(ve))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Optical processing pipeline failure: {str(e)}",
        )

@router.post("/upload", response_model=MoistureAnalysisResponse)
async def analyze_moisture_upload(
    ambient_file: UploadFile = File(..., description="Primary inspection image file"),
    flash_file: Optional[UploadFile] = File(None, description="Optional on-axis flash photo"),
    report_id: Optional[str] = Form(None),
    property_id: Optional[str] = Form(None),
    sensitivity: Optional[float] = Form(0.5),
    db = Depends(get_db),
):
    """
    Executes OpenCV optical difference analysis directly on multipart uploaded image files.
    """
    ambient_bytes = await ambient_file.read()
    flash_bytes = await flash_file.read() if flash_file else None

    if len(ambient_bytes) == 0:
        raise HTTPException(status_code=400, detail="Primary ambient image file is empty.")

    try:
        response = process_moisture_analysis(
            ambient_input=ambient_bytes,
            flash_input=flash_bytes,
            report_id=report_id,
            sensitivity=sensitivity or 0.5,
        )

        if db is not None:
            now_str = datetime.datetime.now(datetime.timezone.utc).isoformat()
            await db.image_analysis.insert_one({
                "report_id": report_id,
                "property_id": property_id,
                "processing_status": response.status,
                "is_suitable": response.is_suitable,
                "alignment_quality": response.alignment_quality,
                "difference_percentage": response.difference_percentage,
                "anomaly_count": response.anomaly_count,
                "result_summary": response.result_summary,
                "execution_time_ms": response.execution_time_ms,
                "created_at": now_str,
            })

        return response
    except ValueError as ve:
        raise HTTPException(status_code=422, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Optical upload processing failed: {str(e)}")
