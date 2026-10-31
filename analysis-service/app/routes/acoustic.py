from fastapi import APIRouter, HTTPException, UploadFile, File, Form, status
from typing import Optional
import scipy
import soundfile as sf
import numpy as np

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
async def analyze_acoustic_json(payload: AcousticAnalysisRequest):
    """
    Executes real SciPy/NumPy FFT acoustic signal analysis on Base64/URL audio recording.
    Calculates waveform envelope, Butterworth filtering, FFT spectrum, PSD,
    frequency band energies, dominant frequency, and anomaly indicators.
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
        return response
    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(ve),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Acoustic signal processing pipeline failure: {str(e)}",
        )


@router.post("/upload", response_model=AcousticAnalysisResponse)
async def analyze_acoustic_upload(
    audio_file: UploadFile = File(..., description="Audio recording file (WAV, MP3, OGG, FLAC)"),
    report_id: Optional[str] = Form(None),
    property_id: Optional[str] = Form(None),
    min_frequency_hz: Optional[float] = Form(20.0),
    max_frequency_hz: Optional[float] = Form(8000.0),
    filter_order: Optional[int] = Form(4),
):
    """
    Executes acoustic FFT signal analysis directly from a multipart file upload.
    """
    try:
        audio_bytes = await audio_file.read()

        if len(audio_bytes) == 0:
            raise HTTPException(status_code=400, detail="Audio file buffer is empty (0 bytes).")

        response = process_acoustic_analysis(
            input_data=audio_bytes,
            report_id=report_id,
            property_id=property_id,
            min_frequency_hz=float(min_frequency_hz or 20.0),
            max_frequency_hz=float(max_frequency_hz or 8000.0),
            filter_order=int(filter_order or 4),
        )
        return response
    except HTTPException:
        raise
    except ValueError as ve:
        raise HTTPException(status_code=422, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Acoustic signal processing failure: {str(e)}")
