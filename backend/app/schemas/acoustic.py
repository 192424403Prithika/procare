from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class FrequencyBand(BaseModel):
    name: str = Field(description="Band name (e.g. Sub-audible, Low Cavity, Mid Plumbing, High Leak, Ultrasonic)")
    range_hz: List[float] = Field(description="[min_hz, max_hz]")
    energy: float = Field(description="Integrated spectral energy in band")
    energy_percentage: float = Field(description="Percentage of total acoustic energy in this band")
    significance: str = Field(description="typical | elevated | prominent")

class SpectrumPoint(BaseModel):
    frequency_hz: float
    magnitude: float
    magnitude_db: float
    psd_db: float

class WaveformPoint(BaseModel):
    time_seconds: float
    min_amplitude: float
    max_amplitude: float
    rms_amplitude: float

class AcousticAnomalyIndicators(BaseModel):
    anomaly_score: float = Field(description="Calculated acoustic anomaly index (0 - 100)")
    anomaly_classification: str = Field(
        description="baseline_ambient | low_frequency_hum | elevated_high_frequency | transient_environmental"
    )
    spectral_flatness: float = Field(description="Wiener entropy / spectral flatness (0.0 - 1.0)")
    spectral_centroid_hz: float = Field(description="Center of spectral mass in Hz")
    spectral_rolloff_hz: float = Field(description="85% energy concentration rolloff frequency")
    high_frequency_ratio: float = Field(description="Ratio of energy above 1.5 kHz to total energy")
    peak_prominence: float = Field(description="Prominence of dominant spectral peak")
    is_anomaly_detected: bool = Field(description="Whether acoustic anomaly thresholds were exceeded")

class AcousticAnalysisRequest(BaseModel):
    report_id: Optional[str] = None
    property_id: Optional[str] = None
    audio_data: str = Field(description="Base64 encoded string, data URI, or publicly accessible URL")
    min_frequency_hz: Optional[float] = Field(default=20.0, ge=10.0, description="Configurable high-pass filter cutoff")
    max_frequency_hz: Optional[float] = Field(default=8000.0, description="Configurable low-pass filter cutoff")
    filter_order: Optional[int] = Field(default=4, ge=1, le=8)

class AcousticAnalysisResponse(BaseModel):
    status: str = Field(description="completed | failed")
    report_id: Optional[str] = None
    duration_seconds: float = Field(description="Total duration of audio sample in seconds")
    sampling_rate: int = Field(description="Sampling rate in Hz")
    channels: int = Field(default=1, description="Channels processed (converted to mono)")
    dominant_frequency: float = Field(description="Peak frequency in Hz")
    dominant_frequency_magnitude_db: float = Field(default=0.0)
    frequency_bands: List[FrequencyBand] = []
    anomaly_indicators: AcousticAnomalyIndicators
    frequency_spectrum: List[SpectrumPoint] = []
    waveform_data: List[WaveformPoint] = []
    waveform_svg: str = Field(default="", description="Rendered vector SVG of acoustic waveform")
    spectrum_svg: str = Field(default="", description="Rendered vector SVG of FFT frequency spectrum")
    result_summary: str
    confidence_level: str = Field(description="high | medium | low")
    confidence_score: float = Field(description="Score between 0 and 100 based on SNR and duration")
    limitations: List[str]
    execution_time_ms: float
    metadata: Dict[str, Any] = {}
