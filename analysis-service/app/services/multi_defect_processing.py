from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field

class CandidateDefect(BaseModel):
    defect_type: str
    label: str
    probability: float
    urgency: str
    recommended_trade: str
    evidence_basis: str

class MultiDefectAnalysisResponse(BaseModel):
    report_id: Optional[str] = None
    property_id: Optional[str] = None
    primary_defect: str
    primary_label: str
    confidence_score: float
    statutory_urgency: str
    recommended_trade: str
    candidates: List[CandidateDefect]
    cross_modal_synthesis: str
    limitations: List[str]
    metadata: Dict[str, Any] = Field(default_factory=dict)

def classify_multi_defect(
    optical_diff_pct: Optional[float] = None,
    acoustic_freq_hz: Optional[float] = None,
    acoustic_score: Optional[float] = None,
    dew_point_margin_c: Optional[float] = None,
    zone_description: str = "",
    symptom_tags: Optional[List[str]] = None,
    report_id: Optional[str] = None,
    property_id: Optional[str] = None,
    has_image: bool = True,
    has_audio: bool = True,
    has_weather: bool = True,
) -> MultiDefectAnalysisResponse:
    """
    Executes explainable cross-modal defect indicator classification combining:
    - OpenCV specular reflectance difference percentage (if image provided)
    - SciPy FFT acoustic resonance frequency and score (if audio provided)
    - Psychrometric dew-point proximity (if weather telemetry available)
    - Qualitative clinical symptoms and zone context

    Strictly complies with statutory guidelines: treats output as screening indicators
    requiring physical human surveyor verification rather than claiming definitive confirmation.
    """
    symptoms = [s.lower() for s in (symptom_tags or [])]
    zone_lower = (zone_description or "").lower()

    image_available = bool(has_image and optical_diff_pct is not None)
    audio_available = bool(has_audio and acoustic_freq_hz is not None and acoustic_freq_hz > 0)
    weather_available = bool(has_weather and dew_point_margin_c is not None)

    candidates: List[CandidateDefect] = []

    # 1. Pressurized Supply Pipe Pinhole Leak Indicator
    pipe_prob = 10.0
    pipe_evidence: List[str] = []

    if audio_available and acoustic_freq_hz is not None:
        if 850 <= acoustic_freq_hz <= 1800:
            pipe_prob += 50.0
            pipe_evidence.append(f"Acoustic resonance peak detected at {acoustic_freq_hz:.0f} Hz (typical pressurized fluid velocity band 900-1600 Hz)")
        elif acoustic_freq_hz > 0:
            pipe_evidence.append(f"Acoustic frequency at {acoustic_freq_hz:.0f} Hz is outside primary pipe turbulence band")
        if acoustic_score and acoustic_score > 70:
            pipe_prob += 15.0
    else:
        pipe_evidence.append("Acoustic audio recording not available; fluid velocity resonance could not be evaluated")

    if image_available and optical_diff_pct is not None:
        if optical_diff_pct > 8.0:
            pipe_prob += 15.0
            pipe_evidence.append(f"OpenCV optical surface difference of {optical_diff_pct:.1f}% indicates localized surface anomaly")
    else:
        pipe_evidence.append("Optical photograph not available")

    if any(k in zone_lower for k in ["riser", "pipe", "bathroom", "ceiling", "chase", "kitchen"]):
        pipe_prob += 5.0
        pipe_evidence.append("Zone location involves wet service routes or pipe enclosures")

    pipe_prob = min(94.0, max(5.0, pipe_prob))
    candidates.append(
        CandidateDefect(
            defect_type="pressurized_pipe_pinhole",
            label="Pressurized Supply Pipe Pinhole Indicator",
            probability=round(pipe_prob, 1),
            urgency="Emergency 24h" if pipe_prob >= 75 else "Urgent 7d",
            recommended_trade="Plumbing & Acoustic Leak Detection (CIPHE / Gas Safe)",
            evidence_basis=". ".join(pipe_evidence) + ".",
        )
    )

    # 2. Interstitial Condensation & Biofilm Colonisation Indicator
    cond_prob = 15.0
    cond_evidence: List[str] = []

    if image_available and optical_diff_pct is not None:
        if optical_diff_pct >= 5.0:
            cond_prob += 30.0
            cond_evidence.append(f"Optical surface anomaly of {optical_diff_pct:.1f}% detected via OpenCV reflectance evaluation")
    else:
        cond_evidence.append("Optical photograph not available")

    if audio_available and acoustic_freq_hz is not None:
        if acoustic_freq_hz < 300:
            cond_prob += 20.0
            cond_evidence.append(f"Acoustic resonance ({acoustic_freq_hz:.0f} Hz) indicates absence of high-frequency fluid turbulence")
    else:
        cond_evidence.append("Acoustic telemetry not available")

    if weather_available and dew_point_margin_c is not None:
        if dew_point_margin_c <= 1.5:
            cond_prob += 20.0
            cond_evidence.append(f"Psychrometric dew point margin is narrow ({dew_point_margin_c:.1f}°C), indicating condensation vulnerability")
        else:
            cond_evidence.append(f"Dew point margin is {dew_point_margin_c:.1f}°C")
    else:
        cond_evidence.append("Open-Meteo psychrometric weather telemetry not available")

    if any(s in symptoms for s in ["visible mould", "musty odour", "damp patches"]):
        cond_prob += 15.0
        cond_evidence.append("Reported surveyor symptoms include damp or mould indicators")

    cond_prob = min(92.0, max(5.0, cond_prob))
    candidates.append(
        CandidateDefect(
            defect_type="interstitial_condensation_biofilm",
            label="Interstitial Condensation & Biofilm Indicator",
            probability=round(cond_prob, 1),
            urgency="Urgent 7d" if any("mould" in s for s in symptoms) or cond_prob >= 70 else "Standard 14d",
            recommended_trade="Damp & Mould Remediation (PCA / PAS 2035)",
            evidence_basis=". ".join(cond_evidence) + ".",
        )
    )

    # 3. Structural Rising Damp & Masonry Salt Migration Indicator
    rising_prob = 10.0
    rising_evidence: List[str] = []

    if any(k in zone_lower for k in ["ground", "subfloor", "skirting", "basement", "external wall"]):
        rising_prob += 35.0
        rising_evidence.append("Zone orientation is at ground or subfloor level")

    if any(s in symptoms for s in ["peeling plaster", "spongy surface", "efflorescence", "tide mark"]):
        rising_prob += 25.0
        rising_evidence.append("Reported symptoms include plaster degradation or surface tide marks")

    if audio_available and acoustic_freq_hz is not None and acoustic_freq_hz < 200:
        rising_prob += 10.0
        rising_evidence.append("Zero pressurized acoustic vibration detected")

    rising_prob = min(90.0, max(5.0, rising_prob))
    candidates.append(
        CandidateDefect(
            defect_type="rising_damp_salt_migration",
            label="Structural Rising Damp & Masonry Salt Indicator",
            probability=round(rising_prob, 1),
            urgency="Standard 14d",
            recommended_trade="Damp-Proofing & Cavity Ties (PCA Registered)",
            evidence_basis=". ".join(rising_evidence) if rising_evidence else "Subfloor inspection zone without pressurized acoustic activity.",
        )
    )

    # 4. Thermal Envelope Seal Breakdown Indicator
    envelope_prob = 10.0
    envelope_evidence: List[str] = []

    if any("draft" in s or "window" in zone_lower or "rebate" in zone_lower or "jamb" in zone_lower for s in symptoms):
        envelope_prob += 40.0
        envelope_evidence.append("Draft symptoms or fenestration perimeter reported")

    if weather_available and dew_point_margin_c is not None and dew_point_margin_c <= 1.0:
        envelope_prob += 20.0
        envelope_evidence.append(f"Narrow thermal margin ({dew_point_margin_c:.1f}°C) to external dew point")

    if image_available and optical_diff_pct is not None and optical_diff_pct < 6.0:
        envelope_prob += 10.0

    envelope_prob = min(88.0, max(5.0, envelope_prob))
    candidates.append(
        CandidateDefect(
            defect_type="thermal_envelope_seal_gap",
            label="Thermal Envelope Seal Degradation Indicator",
            probability=round(envelope_prob, 1),
            urgency="Standard 14d",
            recommended_trade="Thermal Envelope & Window Glazing Remediation",
            evidence_basis=". ".join(envelope_evidence) if envelope_evidence else "Perimeter thermal boundary exposure.",
        )
    )

    # Sort candidates by probability descending
    candidates.sort(key=lambda c: c.probability, reverse=True)
    primary = candidates[0]

    # Explainable narrative synthesis
    fused_parts = []
    if image_available and optical_diff_pct is not None:
        fused_parts.append(f"OpenCV optical difference ({optical_diff_pct:.1f}%)")
    else:
        fused_parts.append("optical photo: not available")

    if audio_available and acoustic_freq_hz is not None:
        fused_parts.append(f"SciPy FFT acoustic resonance ({acoustic_freq_hz:.0f} Hz)")
    else:
        fused_parts.append("acoustic audio: not available")

    if weather_available and dew_point_margin_c is not None:
        fused_parts.append(f"Open-Meteo dew point margin ({dew_point_margin_c:.1f}°C)")
    else:
        fused_parts.append("weather telemetry: not available")

    synthesis = (
        f"Cross-modal evaluation synthesized {', '.join(fused_parts)}. "
        f"Primary screening indicator: {primary.label} ({primary.probability}% algorithmic indication index). "
        f"Recommended trade consultation: {primary.recommended_trade} under {primary.urgency} target review window. "
        "Important: This result is a preliminary screening indicator and does not confirm active leakage or mould. "
        "Physical inspection with calibrated instruments by a qualified surveyor is mandatory before disruptive intervention."
    )

    limitations = [
        "PRELIMINARY INDICATOR ONLY: Algorithmic results are screening aids and do not constitute a structural confirmation. Physical non-destructive pin/dielectric meter testing and surveyor review are required.",
        "MANDATORY SURVEYOR VERIFICATION: No invasive wall breakout, ceiling breach, or tenant displacement should proceed without physical on-site verification.",
        "ACOUSTIC & THERMAL DYNAMICS: Acoustic resonance can fluctuate with system operating pressure; psychrometric condensation estimates depend on ambient ventilation and occupancy patterns.",
    ]

    if not image_available:
        limitations.append("OPTICAL DATA MISSING: No inspection photograph was provided for OpenCV image analysis.")
    if not audio_available:
        limitations.append("ACOUSTIC DATA MISSING: No audio recording was provided for SciPy FFT signal processing.")
    if not weather_available:
        limitations.append("WEATHER DATA MISSING: Property coordinates were unavailable for Open-Meteo meteorological queries.")

    return MultiDefectAnalysisResponse(
        report_id=report_id,
        property_id=property_id,
        primary_defect=primary.defect_type,
        primary_label=primary.label,
        confidence_score=primary.probability,
        statutory_urgency=primary.urgency,
        recommended_trade=primary.recommended_trade,
        candidates=candidates,
        cross_modal_synthesis=synthesis,
        limitations=limitations,
        metadata={
            "optical_diff_pct": optical_diff_pct,
            "acoustic_freq_hz": acoustic_freq_hz,
            "dew_point_margin_c": dew_point_margin_c,
            "has_optical_data": image_available,
            "has_acoustic_data": audio_available,
            "has_weather_data": weather_available,
        },
    )
