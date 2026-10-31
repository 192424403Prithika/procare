import datetime
from typing import Dict, Any, List, Optional

def compute_explainable_risk_assessment(
    property_data: Dict[str, Any],
    optical_difference_pct: Optional[float] = None,
    acoustic_frequency_hz: Optional[float] = None,
    acoustic_score: Optional[float] = None,
    dew_point_margin_c: Optional[float] = None,
    symptoms: Optional[List[str]] = None,
    inspector_notes: Optional[str] = "",
) -> Dict[str, Any]:
    """
    Computes a transparent, mathematically explainable risk score:
    - OpenCV Optical Disparity (35%)
    - SciPy Acoustic Resonance (25%)
    - Open-Meteo Dew Point Margin (25%)
    - Building Vintage & Material Vulnerability (15%)
    """
    factors = []
    evidence_refs = []
    recommendations = []

    # 1. Optical Component (Weight: 35%)
    if optical_difference_pct is not None:
        # Scale: 0% diff = 0, 50%+ diff = 100
        opt_normalized = min(100.0, max(0.0, (optical_difference_pct / 50.0) * 100.0))
        factors.append({
            "name": "Optical Specular Sheen (OpenCV)",
            "weight": 0.35,
            "raw_value": f"{optical_difference_pct:.2f}% disparity",
            "normalized_score": round(opt_normalized, 1),
            "description": "Surface reflectance differential between flash and ambient baseline frames."
        })
        evidence_refs.append(f"Optical analysis: {optical_difference_pct:.1f}% specular disparity detected.")
    else:
        opt_normalized = 20.0  # Baseline neutral
        factors.append({
            "name": "Optical Specular Sheen (Baseline)",
            "weight": 0.35,
            "raw_value": "No optical data provided",
            "normalized_score": opt_normalized,
            "description": "Default baseline applied in absence of photographic frame."
        })

    # 2. Acoustic Component (Weight: 25%)
    if acoustic_score is not None:
        ac_normalized = min(100.0, max(0.0, float(acoustic_score)))
        freq_str = f" at {acoustic_frequency_hz:.0f}Hz" if acoustic_frequency_hz else ""
        factors.append({
            "name": "Acoustic Leak Resonance (SciPy FFT)",
            "weight": 0.25,
            "raw_value": f"{acoustic_score:.1f}/100 anomaly{freq_str}",
            "normalized_score": round(ac_normalized, 1),
            "description": "High-frequency acoustic energy concentration consistent with pressurized or fluid turbulence."
        })
        evidence_refs.append(f"Acoustic analysis: Anomaly score {acoustic_score:.0f}/100{freq_str}.")
    else:
        ac_normalized = 15.0
        factors.append({
            "name": "Acoustic Leak Resonance (Baseline)",
            "weight": 0.25,
            "raw_value": "No acoustic recording provided",
            "normalized_score": ac_normalized,
            "description": "Default baseline applied."
        })

    # 3. Weather / Dew Point Component (Weight: 25%)
    if dew_point_margin_c is not None:
        # Scale: <= 0.5C margin = 100, >= 6.0C margin = 0
        if dew_point_margin_c <= 0.5:
            dew_normalized = 100.0
        elif dew_point_margin_c >= 6.0:
            dew_normalized = 5.0
        else:
            dew_normalized = max(0.0, (6.0 - dew_point_margin_c) / 5.5 * 100.0)
        factors.append({
            "name": "Psychrometric Condensation Margin (Open-Meteo)",
            "weight": 0.25,
            "raw_value": f"{dew_point_margin_c:.1f}°C temperature buffer",
            "normalized_score": round(dew_normalized, 1),
            "description": "Thermal margin between ambient temperature and Magnus-Tetens dew point."
        })
        evidence_refs.append(f"Psychrometric telemetry: {dew_point_margin_c:.1f}°C margin above dew point.")
    else:
        dew_normalized = 25.0
        factors.append({
            "name": "Psychrometric Condensation Margin (Baseline)",
            "weight": 0.25,
            "raw_value": "Regional climate estimate",
            "normalized_score": dew_normalized,
            "description": "Standard North West UK humidity assumption."
        })

    # 4. Building Age & Vulnerability Component (Weight: 15%)
    build_year = property_data.get("build_year", 1980)
    current_year = datetime.datetime.now().year
    age = max(0, current_year - build_year)
    # Scale: age 0 = 10, age 100+ = 90
    age_normalized = min(95.0, max(10.0, 10.0 + (age / 100.0) * 80.0))
    factors.append({
        "name": "Building Vintage & Fabric Susceptibility",
        "weight": 0.15,
        "raw_value": f"Built {build_year} ({age} years old)",
        "normalized_score": round(age_normalized, 1),
        "description": "Uninsulated cavity/solid brick pre-regulation housing stock factor."
    })

    # Calculate Weighted Total
    total_score = sum(f["weight"] * f["normalized_score"] for f in factors)
    final_score = int(round(total_score))

    # Determine Category & Statutory SLAs
    if final_score >= 75:
        category = "critical"
        recommendations.extend([
            "Awaab's Law Emergency Window: Initiate certified on-site surveyor inspection within 24 hours.",
            "Dispatch qualified Damp Remediation or Plumbing contractor for physical verification.",
            "Install continuous environmental temperature & RH loggers in affected room."
        ])
    elif final_score >= 50:
        category = "high"
        recommendations.extend([
            "Schedule invasive physical inspection within 7 days.",
            "Check external rainwater drainage, guttering, and pointing adjacent to zone.",
            "Provide tenant with moisture mitigation guidance and ventilation review."
        ])
    elif final_score >= 30:
        category = "moderate"
        recommendations.extend([
            "Conduct routine diagnostic survey within 14 calendar days.",
            "Monitor hygrometric readings during next low-temperature cycle."
        ])
    else:
        category = "low"
        recommendations.extend([
            "No immediate structural hazard detected.",
            "Maintain standard annual inspection cycle."
        ])

    return {
        "risk_category": category,
        "risk_score": final_score,
        "factors": factors,
        "evidence_references": evidence_refs,
        "calculation_details": {
            "formula": "0.35 * Optical + 0.25 * Acoustic + 0.25 * DewPoint + 0.15 * BuildingAge",
            "computed_raw_sum": round(total_score, 2),
            "evaluated_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        },
        "recommendations": recommendations,
        "disclaimer": (
            "This algorithmic risk triage combines multi-modal telemetry and environmental heuristics. "
            "It prioritizes investigation urgency but does NOT constitute a statutory building certificate "
            "without independent on-site surveyor verification."
        )
    }
