import io
import struct
import wave
import numpy as np
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services.acoustic_processing import (
    process_acoustic_analysis,
    decode_audio_input,
    apply_butterworth_bandpass,
)

client = TestClient(app)


def generate_wav_bytes(
    duration_s: float = 2.0,
    sample_rate: int = 44100,
    tone_freqs: list = None,
    noise_amplitude: float = 0.05,
) -> bytes:
    """Helper to synthesize calibrated WAV byte streams."""
    if tone_freqs is None:
        tone_freqs = []

    num_samples = int(duration_s * sample_rate)
    t = np.linspace(0, duration_s, num_samples, endpoint=False)

    signal = np.zeros(num_samples, dtype=np.float32)

    # Add tones
    for freq, amp in tone_freqs:
        signal += amp * np.sin(2.0 * np.pi * freq * t).astype(np.float32)

    # Add background noise
    if noise_amplitude > 0:
        signal += np.random.normal(0, noise_amplitude, num_samples).astype(np.float32)

    # Normalize to prevent clipping
    max_val = np.max(np.abs(signal))
    if max_val > 0.95:
        signal = signal / max_val * 0.95

    # Convert to 16-bit PCM WAV
    int_signal = (signal * 32767.0).astype(np.int16)

    bio = io.BytesIO()
    with wave.open(bio, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sample_rate)
        wf.writeframes(int_signal.tobytes())

    return bio.getvalue()


def test_acoustic_health_endpoint():
    """Verify health endpoint returns status and supported formats."""
    res = client.get("/api/v1/analyze/acoustic/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "online"
    assert "WAV" in data["supported_audio_formats"]
    assert data["features"]["fft_rfft"] is True


def test_quiet_background_recording():
    """
    Test Case 1: Quiet diffuse background noise.
    Should result in baseline_ambient classification with low anomaly score.
    """
    quiet_wav = generate_wav_bytes(
        duration_s=2.5,
        sample_rate=44100,
        tone_freqs=[],
        noise_amplitude=0.02,
    )

    result = process_acoustic_analysis(quiet_wav, report_id="REP-QUIET-01")

    assert result.status == "completed"
    assert result.duration_seconds >= 2.4
    assert result.sampling_rate == 44100
    assert result.anomaly_indicators.anomaly_classification in [
        "baseline_ambient",
        "transient_environmental",
    ]
    assert result.anomaly_indicators.is_anomaly_detected is False
    assert result.anomaly_indicators.anomaly_score < 40.0
    assert len(result.frequency_bands) == 5
    assert len(result.waveform_data) > 0
    assert len(result.frequency_spectrum) > 0
    assert result.waveform_svg.startswith("<svg")


def test_environmental_sound_low_frequency_hum():
    """
    Test Case 2: Environmental mechanical building sound (50 Hz mains/HVAC vibration hum).
    Should identify 50 Hz dominant frequency and classify as low_frequency_hum.
    """
    hum_wav = generate_wav_bytes(
        duration_s=3.0,
        sample_rate=44100,
        tone_freqs=[(50.0, 0.7), (100.0, 0.3)],  # Strong 50 Hz hum + harmonic
        noise_amplitude=0.03,
    )

    result = process_acoustic_analysis(hum_wav, report_id="REP-HUM-02")

    assert result.status == "completed"
    # Dominant frequency should be close to 50 Hz
    assert abs(result.dominant_frequency - 50.0) < 15.0
    assert result.anomaly_indicators.anomaly_classification == "low_frequency_hum"
    assert result.anomaly_indicators.is_anomaly_detected is False
    assert "HUM" in result.result_summary.upper()


def test_suspected_water_related_sound():
    """
    Test Case 3: Labelled example of suspected water-related acoustic signature
    (persistent high-frequency turbulence / orifice jet hiss around 2.8 kHz).
    """
    leak_wav = generate_wav_bytes(
        duration_s=3.0,
        sample_rate=44100,
        tone_freqs=[(2850.0, 0.8), (3200.0, 0.4)],  # Persistent resonant hiss
        noise_amplitude=0.08,
    )

    result = process_acoustic_analysis(leak_wav, report_id="REP-WATER-03")

    assert result.status == "completed"
    assert abs(result.dominant_frequency - 2850.0) < 50.0
    assert result.anomaly_indicators.anomaly_classification == "elevated_high_frequency"
    assert result.anomaly_indicators.is_anomaly_detected is True
    assert result.anomaly_indicators.anomaly_score > 50.0

    # Ensure technical caution: does not assert definitive leak proof
    assert len(result.limitations) >= 3
    summary = result.result_summary.lower()
    assert "confirm" not in summary or "cannot confirm" in summary or "warrants" in summary


def test_corrupted_and_empty_audio_files():
    """
    Test Case 4: Invalid, empty, or corrupted audio inputs.
    Must gracefully return proper HTTP 422 error codes.
    """
    # 1. Empty bytes
    with pytest.raises(ValueError, match="buffer is empty"):
        decode_audio_input(b"")

    # 2. Corrupted random garbage
    with pytest.raises(ValueError):
        decode_audio_input(b"RANDOM_CORRUPTED_NON_AUDIO_GARBAGE_PAYLOAD_XYZ")

    # 3. Too short clip (< 0.2s)
    short_wav = generate_wav_bytes(duration_s=0.05, sample_rate=44100)
    with pytest.raises(ValueError, match="shorter than minimum"):
        decode_audio_input(short_wav)


def test_fastapi_json_and_multipart_routes():
    """Test both JSON Base64 and direct multipart upload endpoints."""
    wav_bytes = generate_wav_bytes(duration_s=1.0, sample_rate=44100, tone_freqs=[(440.0, 0.5)])

    # Test multipart upload route
    files = {"audio_file": ("test_acoustic.wav", wav_bytes, "audio/wav")}
    data = {"report_id": "INSP-TEST-99"}

    resp = client.post("/api/v1/analyze/acoustic/upload", files=files, data=data)
    assert resp.status_code == 200
    res_json = resp.json()
    assert res_json["status"] == "completed"
    assert res_json["sampling_rate"] == 44100
    assert res_json["report_id"] == "INSP-TEST-99"
    assert "waveform_svg" in res_json
    assert "spectrum_svg" in res_json
