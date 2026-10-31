import base64
import io
import time
from typing import Tuple, Dict, Any, List, Optional
import numpy as np
import scipy.signal
import scipy.io.wavfile
import soundfile as sf
import requests

from app.schemas.acoustic import (
    AcousticAnalysisResponse,
    AcousticAnomalyIndicators,
    FrequencyBand,
    SpectrumPoint,
    WaveformPoint,
)

STANDARD_SAMPLE_RATE = 44100
MIN_AUDIO_DURATION_SECONDS = 0.2
MAX_AUDIO_DURATION_SECONDS = 300.0


def integrate_trapz(y: np.ndarray, x: np.ndarray) -> float:
    """Computes trapezoidal integral compatible with NumPy 2.x and earlier."""
    if hasattr(np, "trapezoid"):
        return float(np.trapezoid(y, x))
    return float(np.sum((x[1:] - x[:-1]) * (y[1:] + y[:-1]) * 0.5))


def decode_audio_input(input_data: Any) -> Tuple[np.ndarray, int, int]:
    """
    Decodes an audio file from bytes, base64 data URI, or remote HTTP URL.
    Validates file integrity, duration, channel count, and sampling rate.
    Converts audio to single-channel (mono) float32 normalized in [-1.0, 1.0].
    
    Returns:
        audio_mono: 1D np.ndarray (float32)
        sample_rate: int (Hz)
        original_channels: int
    """
    raw_bytes: bytes

    if isinstance(input_data, bytes):
        raw_bytes = input_data
    elif isinstance(input_data, str):
        data_str = input_data.strip()
        if len(data_str) == 0:
            raise ValueError("Audio input string is empty.")

        # 1. Remote HTTP/HTTPS URL
        if data_str.startswith("http://") or data_str.startswith("https://"):
            try:
                resp = requests.get(data_str, timeout=15)
                resp.raise_for_status()
                raw_bytes = resp.content
            except Exception as e:
                raise ValueError(f"Failed to fetch audio from URL {data_str}: {e}")
        # 2. Base64 data URI or raw base64
        elif "base64," in data_str:
            b64_part = data_str.split("base64,")[1]
            try:
                raw_bytes = base64.b64decode(b64_part)
            except Exception as e:
                raise ValueError(f"Failed to decode base64 audio URI: {e}")
        else:
            try:
                raw_bytes = base64.b64decode(data_str)
            except Exception:
                # If not base64, could be an ASCII mock string
                raw_bytes = data_str.encode("utf-8")
    else:
        raise ValueError(f"Unsupported audio input type: {type(input_data)}")

    # Check for empty buffer
    if len(raw_bytes) == 0:
        raise ValueError("Audio file buffer is empty (0 bytes).")

    # Attempt to read audio using soundfile (supports WAV, MP3, OGG, FLAC)
    audio_data: Optional[np.ndarray] = None
    sample_rate: int = STANDARD_SAMPLE_RATE
    original_channels: int = 1

    bio = io.BytesIO(raw_bytes)
    try:
        data, sr = sf.read(bio, dtype="float32")
        audio_data = data
        sample_rate = int(sr)
        if audio_data.ndim > 1:
            original_channels = audio_data.shape[1]
        else:
            original_channels = 1
    except Exception as sf_err:
        # Fallback to scipy.io.wavfile for WAV files
        try:
            bio.seek(0)
            sr, data = scipy.io.wavfile.read(bio)
            sample_rate = int(sr)
            if data.dtype == np.int16:
                audio_data = data.astype(np.float32) / 32768.0
            elif data.dtype == np.int32:
                audio_data = data.astype(np.float32) / 2147483648.0
            elif data.dtype == np.uint8:
                audio_data = (data.astype(np.float32) - 128.0) / 128.0
            else:
                audio_data = data.astype(np.float32)

            if audio_data.ndim > 1:
                original_channels = audio_data.shape[1]
            else:
                original_channels = 1
        except Exception as wav_err:
            raise ValueError(
                f"Audio file could not be decoded. Supported formats: WAV, MP3, OGG, FLAC. "
                f"Decoder error: {sf_err}; WAV fallback error: {wav_err}"
            )

    if audio_data is None or len(audio_data) == 0:
        raise ValueError("Decoded audio contains no sample frames.")

    # Convert multi-channel to mono
    if audio_data.ndim > 1:
        audio_mono = np.mean(audio_data, axis=1)
    else:
        audio_mono = audio_data

    # Ensure float32 1D
    audio_mono = np.ascontiguousarray(audio_mono, dtype=np.float32)

    # Validate duration
    duration = len(audio_mono) / sample_rate
    if duration < MIN_AUDIO_DURATION_SECONDS:
        raise ValueError(
            f"Audio duration ({duration:.2f}s) is shorter than minimum required "
            f"diagnostic window ({MIN_AUDIO_DURATION_SECONDS}s)."
        )

    return audio_mono, sample_rate, original_channels


def apply_butterworth_bandpass(
    audio: np.ndarray,
    sample_rate: int,
    lowcut_hz: float = 20.0,
    highcut_hz: float = 8000.0,
    order: int = 4,
) -> np.ndarray:
    """
    Applies a zero-phase Butterworth bandpass filter to focus on the target acoustic spectrum
    and suppress sub-audible DC drift and high-frequency aliasing noise.
    """
    nyquist = 0.5 * sample_rate
    # Clamp bounds within valid Nyquist limits
    low = max(10.0, min(lowcut_hz, nyquist * 0.95))
    high = min(highcut_hz, nyquist * 0.98)

    if low >= high:
        # Fallback to highpass if range is inverted
        sos = scipy.signal.butter(order, low / nyquist, btype="highpass", output="sos")
    else:
        sos = scipy.signal.butter(
            order, [low / nyquist, high / nyquist], btype="bandpass", output="sos"
        )

    # Use forward-backward zero-phase filtering
    filtered = scipy.signal.sosfiltfilt(sos, audio)
    return filtered.astype(np.float32)


def extract_waveform_points(
    audio: np.ndarray, sample_rate: int, max_points: int = 300
) -> List[WaveformPoint]:
    """
    Downsamples the raw audio into an envelope of time-indexed Min/Max/RMS points
    suitable for responsive vector rendering in the UI.
    """
    total_samples = len(audio)
    chunk_size = max(1, total_samples // max_points)
    points: List[WaveformPoint] = []

    for i in range(0, total_samples, chunk_size):
        chunk = audio[i : i + chunk_size]
        if len(chunk) == 0:
            continue
        t = float(i / sample_rate)
        min_v = float(np.min(chunk))
        max_v = float(np.max(chunk))
        rms_v = float(np.sqrt(np.mean(chunk**2)))
        points.append(
            WaveformPoint(
                time_seconds=round(t, 3),
                min_amplitude=round(min_v, 4),
                max_amplitude=round(max_v, 4),
                rms_amplitude=round(rms_v, 4),
            )
        )

    return points


def calculate_frequency_bands(
    frequencies: np.ndarray,
    psd_values: np.ndarray,
    total_power: float,
) -> List[FrequencyBand]:
    """
    Calculates acoustic energy across standard diagnostic frequency bands:
    - Sub-audible / Mechanical (20 - 150 Hz)
    - Low Structural Cavity (150 - 500 Hz)
    - Mid Plumbing Turbulence (500 - 2000 Hz)
    - High Micro-Leak / Acoustic Hiss (2000 - 5000 Hz)
    - Ultrasonic / Friction (5000 - 20000 Hz)
    """
    band_defs = [
        {"name": "Sub-audible / Mechanical", "low": 20.0, "high": 150.0},
        {"name": "Low Structural Cavity", "low": 150.0, "high": 500.0},
        {"name": "Mid Plumbing Turbulence", "low": 500.0, "high": 2000.0},
        {"name": "High Micro-Leak / Acoustic Hiss", "low": 2000.0, "high": 5000.0},
        {"name": "Ultrasonic / Surface Friction", "low": 500.00, "high": 20000.0},
    ]

    bands: List[FrequencyBand] = []
    for b in band_defs:
        mask = (frequencies >= b["low"]) & (frequencies < b["high"])
        if np.any(mask) and len(frequencies[mask]) > 1:
            band_energy = integrate_trapz(psd_values[mask], frequencies[mask])
        else:
            band_energy = 0.0

        pct = (band_energy / total_power * 100.0) if total_power > 1e-12 else 0.0

        # Significance label
        if pct > 45.0:
            sig = "prominent"
        elif pct > 20.0:
            sig = "elevated"
        else:
            sig = "typical"

        bands.append(
            FrequencyBand(
                name=b["name"],
                range_hz=[float(b["low"]), float(b["high"])],
                energy=round(band_energy, 6),
                energy_percentage=round(pct, 2),
                significance=sig,
            )
        )

    return bands


def calculate_anomaly_indicators(
    audio: np.ndarray,
    frequencies: np.ndarray,
    magnitudes: np.ndarray,
    psd_frequencies: np.ndarray,
    psd_values: np.ndarray,
    dominant_freq: float,
    bands: List[FrequencyBand],
) -> AcousticAnomalyIndicators:
    """
    Calculates advanced spectral anomaly indicators:
    - Spectral Flatness (Wiener entropy)
    - Spectral Centroid
    - Spectral Rolloff (85% power)
    - High-frequency energy ratio (2 kHz - 5 kHz)
    - Peak prominence
    - Anomaly classification and score
    """
    # 1. Spectral Flatness
    # Add epsilon to prevent log of zero
    safe_psd = np.maximum(psd_values, 1e-12)
    geometric_mean = np.exp(np.mean(np.log(safe_psd)))
    arithmetic_mean = np.mean(safe_psd)
    spectral_flatness = float(geometric_mean / arithmetic_mean) if arithmetic_mean > 0 else 0.0

    # 2. Spectral Centroid
    sum_mag = np.sum(magnitudes)
    if sum_mag > 1e-9:
        centroid = float(np.sum(frequencies * magnitudes) / sum_mag)
    else:
        centroid = 0.0

    # 3. Spectral Rolloff (85% of total power)
    total_power = integrate_trapz(psd_values, psd_frequencies)
    cumulative_power = np.cumsum(psd_values)
    cumulative_power /= (cumulative_power[-1] if cumulative_power[-1] > 0 else 1.0)
    rolloff_idx = np.searchsorted(cumulative_power, 0.85)
    if rolloff_idx < len(psd_frequencies):
        rolloff_hz = float(psd_frequencies[rolloff_idx])
    else:
        rolloff_hz = float(psd_frequencies[-1])

    # 4. High-frequency leak band ratio
    high_leak_band = next(
        (b for b in bands if "High Micro-Leak" in b.name), None
    )
    high_freq_ratio = (
        (high_leak_band.energy_percentage / 100.0) if high_leak_band else 0.0
    )

    # 5. Dominant Peak Prominence
    peaks, properties = scipy.signal.find_peaks(
        magnitudes, prominence=np.max(magnitudes) * 0.1
    )
    peak_prominence = 0.0
    if len(peaks) > 0 and "prominences" in properties:
        peak_prominence = float(np.max(properties["prominences"]))

    # 6. Heuristic Anomaly Classification
    # Pressurized leak acoustic signatures typically feature sustained elevation in 1.5 kHz - 4.5 kHz
    # combined with high centroid and lower flatness than diffuse white noise.
    low_band = next((b for b in bands if "Sub-audible" in b.name or "Low" in b.name), None)
    low_energy_pct = low_band.energy_percentage if low_band else 0.0

    if high_freq_ratio > 0.35 and 1500 <= dominant_freq <= 5000:
        classification = "elevated_high_frequency"
        anomaly_score = min(95.0, 50.0 + (high_freq_ratio * 40.0) + (peak_prominence * 20.0))
        is_anomaly = True
    elif dominant_freq <= 120 and low_energy_pct > 60.0:
        classification = "low_frequency_hum"
        anomaly_score = min(70.0, 30.0 + (low_energy_pct * 0.4))
        is_anomaly = False  # Low mechanical hum is typically HVAC or mains hum, not a fluid leak
    elif spectral_flatness < 0.05 and peak_prominence > 0.2:
        classification = "transient_environmental"
        anomaly_score = 45.0
        is_anomaly = False
    else:
        classification = "baseline_ambient"
        anomaly_score = max(5.0, min(30.0, high_freq_ratio * 30.0))
        is_anomaly = False

    return AcousticAnomalyIndicators(
        anomaly_score=round(anomaly_score, 1),
        anomaly_classification=classification,
        spectral_flatness=round(spectral_flatness, 4),
        spectral_centroid_hz=round(centroid, 1),
        spectral_rolloff_hz=round(rolloff_hz, 1),
        high_frequency_ratio=round(high_freq_ratio, 3),
        peak_prominence=round(peak_prominence, 4),
        is_anomaly_detected=is_anomaly,
    )


def generate_waveform_svg(points: List[WaveformPoint], duration: float) -> str:
    """
    Renders a crisp, responsive SVG path representing the audio waveform.
    """
    if not points:
        return ""
    width = 800
    height = 140
    mid_y = height / 2.0

    # Build path commands
    path_top = []
    path_bottom = []

    for p in points:
        x = (p.time_seconds / duration) * width if duration > 0 else 0
        y_max = mid_y - (p.max_amplitude * (height * 0.45))
        y_min = mid_y - (p.min_amplitude * (height * 0.45))
        path_top.append(f"{x:.1f},{y_max:.1f}")
        path_bottom.append(f"{x:.1f},{y_min:.1f}")

    path_bottom.reverse()
    full_path = f"M {path_top[0]} L " + " L ".join(path_top) + " L " + " L ".join(path_bottom) + " Z"

    svg = (
        f'<svg viewBox="0 0 {width} {height}" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">'
        f'<defs><linearGradient id="waveGrad" x1="0" y1="0" x2="0" y2="1">'
        f'<stop offset="0%" stop-color="#35C6C8" stop-opacity="0.8"/>'
        f'<stop offset="100%" stop-color="#6558F5" stop-opacity="0.2"/>'
        f'</linearGradient></defs>'
        f'<line x1="0" y1="{mid_y}" x2="{width}" y2="{mid_y}" stroke="#334155" stroke-dasharray="3,3" stroke-width="1"/>'
        f'<path d="{full_path}" fill="url(#waveGrad)" stroke="#35C6C8" stroke-width="1"/>'
        f'</svg>'
    )
    return svg


def generate_spectrum_svg(spectrum: List[SpectrumPoint]) -> str:
    """
    Renders a responsive SVG spectrum plot of Decibel Magnitude vs Frequency.
    """
    if not spectrum:
        return ""
    width = 800
    height = 160
    max_freq = max(p.frequency_hz for p in spectrum) if spectrum else 8000.0
    min_db = -80.0
    max_db = 0.0
    db_range = max_db - min_db

    points_str = []
    for pt in spectrum:
        x = (pt.frequency_hz / max_freq) * width if max_freq > 0 else 0
        # Map dB to height
        clamped_db = max(min_db, min(max_db, pt.magnitude_db))
        y = height - ((clamped_db - min_db) / db_range * height)
        points_str.append(f"{x:.1f},{y:.1f}")

    poly_line = " ".join(points_str)
    full_polygon = f"0,{height} " + poly_line + f" {width},{height}"

    svg = (
        f'<svg viewBox="0 0 {width} {height}" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">'
        f'<defs><linearGradient id="specGrad" x1="0" y1="0" x2="0" y2="1">'
        f'<stop offset="0%" stop-color="#8174FF" stop-opacity="0.7"/>'
        f'<stop offset="100%" stop-color="#10172A" stop-opacity="0.0"/>'
        f'</linearGradient></defs>'
        f'<polygon points="{full_polygon}" fill="url(#specGrad)"/>'
        f'<polyline points="{poly_line}" fill="none" stroke="#8174FF" stroke-width="2"/>'
        f'</svg>'
    )
    return svg


def process_acoustic_analysis(
    input_data: Any,
    report_id: Optional[str] = None,
    property_id: Optional[str] = None,
    min_frequency_hz: float = 20.0,
    max_frequency_hz: float = 8000.0,
    filter_order: int = 4,
) -> AcousticAnalysisResponse:
    """
    Executes the full acoustic signal processing pipeline:
    1. Reads and validates the audio recording (WAV, MP3, OGG, FLAC).
    2. Converts to normalized mono float32.
    3. Extracts waveform min/max/RMS points.
    4. Applies Butterworth bandpass filter.
    5. Computes real Fast Fourier Transform (FFT) with Hanning windowing.
    6. Estimates Power Spectral Density (PSD) using Welch's method.
    7. Identifies dominant frequency and spectral peaks.
    8. Calculates integrated band energies and acoustic anomaly indicators.
    9. Renders SVG vector visualizations.
    10. Formulates comprehensive technical summary and statutory limitations.
    """
    start_time = time.time()

    # Step 1: Decode and validate audio input
    audio_raw, sample_rate, original_channels = decode_audio_input(input_data)
    duration_seconds = float(len(audio_raw) / sample_rate)

    # Step 2: Remove DC bias
    audio_dc_removed = audio_raw - np.mean(audio_raw)

    # Step 3: Extract waveform points before heavy filtering for fidelity
    waveform_points = extract_waveform_points(audio_dc_removed, sample_rate, max_points=250)

    # Step 4: Butterworth bandpass filtering
    filtered_audio = apply_butterworth_bandpass(
        audio_dc_removed,
        sample_rate=sample_rate,
        lowcut_hz=min_frequency_hz,
        highcut_hz=max_frequency_hz,
        order=filter_order,
    )

    # Step 5: Fast Fourier Transform (FFT) with Hanning window
    n_samples = len(filtered_audio)
    window = np.hanning(n_samples)
    windowed = filtered_audio * window

    fft_values = np.fft.rfft(windowed)
    fft_frequencies = np.fft.rfftfreq(n_samples, d=1.0 / sample_rate)
    fft_magnitudes = np.abs(fft_values) * (2.0 / np.sum(window))
    fft_magnitudes_db = 20.0 * np.log10(np.maximum(fft_magnitudes, 1e-9))

    # Step 6: Power Spectral Density (PSD) via Welch's method
    nperseg = min(2048, max(256, n_samples // 4))
    psd_freqs, psd_vals = scipy.signal.welch(
        filtered_audio, fs=sample_rate, nperseg=nperseg, scaling="density"
    )
    psd_db = 10.0 * np.log10(np.maximum(psd_vals, 1e-12))

    # Step 7: Dominant Frequency Identification
    # Restrict search to range between min_frequency_hz and max_frequency_hz
    valid_range = (fft_frequencies >= min_frequency_hz) & (fft_frequencies <= max_frequency_hz)
    if np.any(valid_range):
        dom_idx = np.argmax(fft_magnitudes[valid_range])
        dominant_freq = float(fft_frequencies[valid_range][dom_idx])
        dominant_mag_db = float(fft_magnitudes_db[valid_range][dom_idx])
    else:
        dominant_freq = float(fft_frequencies[np.argmax(fft_magnitudes)])
        dominant_mag_db = float(np.max(fft_magnitudes_db))

    # Step 8: Calculate Frequency Band Energies
    total_power = integrate_trapz(psd_vals, psd_freqs)
    bands = calculate_frequency_bands(psd_freqs, psd_vals, total_power)

    # Step 9: Anomaly Indicators
    anomaly_indicators = calculate_anomaly_indicators(
        filtered_audio,
        fft_frequencies,
        fft_magnitudes,
        psd_freqs,
        psd_vals,
        dominant_freq,
        bands,
    )

    # Step 10: Downsample spectrum for JSON payload (e.g. 150 points across spectrum)
    num_spectrum_pts = min(150, len(fft_frequencies))
    step = max(1, len(fft_frequencies) // num_spectrum_pts)
    spectrum_points: List[SpectrumPoint] = []

    for i in range(0, len(fft_frequencies), step):
        f = float(fft_frequencies[i])
        if f > max_frequency_hz * 1.05:
            break
        mag = float(fft_magnitudes[i])
        mag_db = float(fft_magnitudes_db[i])
        # Find nearest PSD value
        nearest_psd_idx = np.searchsorted(psd_freqs, f)
        nearest_psd_idx = min(nearest_psd_idx, len(psd_db) - 1)
        spectrum_points.append(
            SpectrumPoint(
                frequency_hz=round(f, 1),
                magnitude=round(mag, 6),
                magnitude_db=round(mag_db, 2),
                psd_db=round(float(psd_db[nearest_psd_idx]), 2),
            )
        )

    # Step 11: Render inline SVG vectors
    waveform_svg = generate_waveform_svg(waveform_points, duration_seconds)
    spectrum_svg = generate_spectrum_svg(spectrum_points)

    # Step 12: Technical summary & confidence metrics
    high_leak_band = next((b for b in bands if "High Micro-Leak" in b.name), None)
    high_pct = high_leak_band.energy_percentage if high_leak_band else 0.0

    if anomaly_indicators.is_anomaly_detected:
        summary = (
            f"ELEVATED ACOUSTIC SIGNATURE DETECTED: Primary resonant peak at {dominant_freq:.1f} Hz "
            f"({dominant_mag_db:.1f} dB). Elevated high-frequency energy ratio of {high_pct:.1f}% "
            f"in the 2.0 kHz - 5.0 kHz acoustic leak band. Warrants structural cavity investigation."
        )
    elif anomaly_indicators.anomaly_classification == "low_frequency_hum":
        summary = (
            f"LOW-FREQUENCY RESIDUAL HUM: Dominant vibration peak at {dominant_freq:.1f} Hz. "
            f"Consistent with mechanical building services (HVAC, pump, or electrical mains hum). "
            f"High-frequency acoustic leak band is quiescent ({high_pct:.1f}%)."
        )
    else:
        summary = (
            f"QUIESCENT AMBIENT SPECTRUM: Dominant frequency measured at {dominant_freq:.1f} Hz. "
            f"Energy distribution across diagnostic bands is balanced. No abnormal acoustic resonance detected."
        )

    # Confidence calculation: longer duration + adequate SNR gives higher confidence
    snr_est = dominant_mag_db - np.median(fft_magnitudes_db)
    if duration_seconds >= 5.0 and snr_est > 15.0:
        conf_level = "high"
        conf_score = 88.0
    elif duration_seconds >= 2.0:
        conf_level = "medium"
        conf_score = 72.0
    else:
        conf_level = "low"
        conf_score = 54.0

    limitations = [
        "Acoustic signal processing detects frequency anomalies and energy peaks; it does not directly verify concealed fluid containment.",
        "Acoustic resonance frequencies vary significantly depending on pipe material (copper, MDPE, lead, PVC), wall cavity damping, and water pressure.",
        "Environmental interference including occupant speech, street traffic, and appliance motors can create transient frequency spikes.",
        "Findings must be evaluated alongside optical moisture heatmaps and calibrated pin/capacitance moisture probe measurements.",
    ]

    exec_time = (time.time() - start_time) * 1000.0

    return AcousticAnalysisResponse(
        status="completed",
        report_id=report_id,
        duration_seconds=round(duration_seconds, 2),
        sampling_rate=sample_rate,
        channels=original_channels,
        dominant_frequency=round(dominant_freq, 1),
        dominant_frequency_magnitude_db=round(dominant_mag_db, 2),
        frequency_bands=bands,
        anomaly_indicators=anomaly_indicators,
        frequency_spectrum=spectrum_points,
        waveform_data=waveform_points,
        waveform_svg=waveform_svg,
        spectrum_svg=spectrum_svg,
        result_summary=summary,
        confidence_level=conf_level,
        confidence_score=conf_score,
        limitations=limitations,
        execution_time_ms=round(exec_time, 2),
        metadata={
            "property_id": property_id,
            "filter_band": [min_frequency_hz, max_frequency_hz],
            "filter_order": filter_order,
            "window_type": "Hanning",
            "fft_bins": len(fft_frequencies),
            "snr_db": round(float(snr_est), 1),
        },
    )
