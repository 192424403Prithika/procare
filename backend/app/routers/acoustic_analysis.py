import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
import scipy
import soundfile as sf
import numpy as np

from app.core.database import get_db
from app.schemas.acoustic import (
    AcousticAnalysisRequest,
    AcousticAnalysisResponse,
)
from app.services.acoustic_processing import process_acoustic_analysis

router = APIRouter(prefix="/api/v1/analyze/acoustic", tags=["Acoustic FFT Analysis"])

@router.get("/health")
def acoustic_engine_health():
    """Healthcheck endpoint for SciPy & NumPy FFT acoustic signal processing engine."""
    formats = list(sf.available_formats().keys()) if hasattr(sf, "available_formats") else ["WAV"]
    return {
        "status": "online",
        "service": "PropCare NW Acoustic FFT Signal Processing Engine",
        "scipy_version": scipy.__version__,
        "numpy_version": np.__version__,
        "supported_audio_formats": formats,
        "features": {
            "fft_rfft": True,
            "welch_psd": True,
            "butterworth_bandpass": True,
            "spectral_flatness": True,
            "spectral_centroid": True,
            "waveform_envelope": True,
            "svg_visualizations": True,
        },
    }

@router.post("", response_model=AcousticAnalysisResponse)
async def analyze_acoustic_json(
    payload: AcousticAnalysisRequest,
    db = Depends(get_db),
):
    """
    Executes actual SciPy/NumPy FFT acoustic signal analysis on Base64 or URL audio recording.
    Saves analysis findings in MongoDB 'acoustic_analysis' collection.
    """
    try:
        response = process_acoustic_analysis(
            input_data=payload.audio_data,
            report_id=payload.report_id,
            property_id=payload.property_id,
            min_frequency_hz=payload.min_frequency_hz or 20.0,
            max_frequency_hz=payload.max_frequency_hz or 8000.0,
            filter_order=payload.filter_order or 4,
        )

        if db is not None:
            now_str = datetime.datetime.now(datetime.timezone.utc).isoformat()
            analysis_doc = {
                "report_id": payload.report_id,
                "property_id": payload.property_id,
                "processing_status": response.status,
                "duration_seconds": response.duration_seconds,
                "sampling_rate": response.sampling_rate,
                "dominant_frequency": response.dominant_frequency,
                "anomaly_indicators": response.anomaly_indicators.model_dump() if response.anomaly_indicators else {},
                "result_summary": response.result_summary,
                "waveform_svg": response.waveform_svg,
                "spectrum_svg": response.spectrum_svg,
                "created_at": now_str,
            }
            await db.acoustic_analysis.insert_one(analysis_doc)

            # Update inspection record if report_id given
            if payload.report_id:
                await db.inspections.update_one(
                    {"_id": payload.report_id} if len(payload.report_id) == 24 else {"id": payload.report_id},
                    {
                        "$set": {
                            "acoustic_leak_frequency_hz": response.dominant_frequency,
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
            detail=f"Acoustic signal processing error: {str(e)}",
        )

@router.post("/upload", response_model=AcousticAnalysisResponse)
async def analyze_acoustic_upload(
    audio_file: UploadFile = File(..., description="Audio recording file (WAV, MP3, FLAC, OGG)"),
    report_id: Optional[str] = Form(None),
    property_id: Optional[str] = Form(None),
    min_frequency_hz: Optional[float] = Form(20.0),
    max_frequency_hz: Optional[float] = Form(8000.0),
    filter_order: Optional[int] = Form(4),
    db = Depends(get_db),
):
    """
    Direct multipart audio upload endpoint for real-time FFT leak acoustic processing.
    """
    audio_bytes = await audio_file.read()
    if len(audio_bytes) == 0:
        raise HTTPException(status_code=400, detail="Uploaded audio file buffer is empty.")

    try:
        response = process_acoustic_analysis(
            input_data=audio_bytes,
            report_id=report_id,
            property_id=property_id,
            min_frequency_hz=min_frequency_hz or 20.0,
            max_frequency_hz=max_frequency_hz or 8000.0,
            filter_order=filter_order or 4,
        )

        if db is not None:
            now_str = datetime.datetime.now(datetime.timezone.utc).isoformat()
            await db.acoustic_analysis.insert_one({
                "report_id": report_id,
                "property_id": property_id,
                "processing_status": response.status,
                "dominant_frequency": response.dominant_frequency,
                "duration_seconds": response.duration_seconds,
                "sampling_rate": response.sampling_rate,
                "result_summary": response.result_summary,
                "created_at": now_str,
            })

        return response
    except ValueError as ve:
        raise HTTPException(status_code=422, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Acoustic upload failure: {str(e)}")
