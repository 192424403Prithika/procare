import datetime
import uuid
from typing import Dict, Any, List, Optional, Tuple
import numpy as np
import cv2
from pydantic import BaseModel, Field

from app.services.image_processing import (
    decode_image_input,
    validate_image_suitability,
    resize_proportional,
    align_images_feature_matching,
    normalize_exposure,
    encode_image_to_base64_data_uri,
)

class DamageComparisonResult(BaseModel):
    comparison_id: str
    property_id: Optional[str] = None
    inspection_zone: Optional[str] = None
    previous_date: Optional[str] = None
    current_date: Optional[str] = None
    change_status: str  # deterioration, improvement, no_significant_change
    change_percentage: float  # 0 - 100
    alignment_quality: float  # 0 - 100
    alignment_method: str
    change_summary: str
    previous_image_url: str
    current_image_url: str
    aligned_current_url: str
    difference_heatmap_url: str
    created_at: str
    scientific_disclaimer: str

def compare_inspection_images(
    previous_input: Any,
    current_input: Any,
    property_id: Optional[str] = None,
    inspection_zone: Optional[str] = None,
    previous_date: Optional[str] = None,
    current_date: Optional[str] = None,
) -> DamageComparisonResult:
    """
    Performs forensic before-and-after damage comparison between two inspection images:
    1. SIFT feature matching and RANSAC homographic planar alignment.
    2. Median-gain exposure normalization to eliminate flash/lighting variances.
    3. Multichannel absolute difference computation and morphological noise filtration.
    4. Structural delta classification: improvement, deterioration, or no significant change.
    """
    prev_raw = decode_image_input(previous_input)
    curr_raw = decode_image_input(current_input)

    # Validate both images
    p_ok, p_err, _ = validate_image_suitability(prev_raw)
    if not p_ok:
        raise ValueError(f"Previous image invalid: {p_err}")
    c_ok, c_err, _ = validate_image_suitability(curr_raw)
    if not c_ok:
        raise ValueError(f"Current image invalid: {c_err}")

    # Standardize dimensions
    prev_img, _ = resize_proportional(prev_raw, max_dim=800)
    curr_img, _ = resize_proportional(curr_raw, max_dim=800)

    h_p, w_p = prev_img.shape[:2]
    curr_resized = cv2.resize(curr_img, (w_p, h_p), interpolation=cv2.INTER_AREA)

    # 1. Feature-based alignment
    aligned_curr, align_qual, align_method = align_images_feature_matching(prev_img, curr_resized)

    # 2. Exposure normalization
    prev_norm, curr_norm = normalize_exposure(prev_img, aligned_curr)

    # 3. Compute difference
    prev_gray = cv2.cvtColor(prev_norm, cv2.COLOR_BGR2GRAY)
    curr_gray = cv2.cvtColor(curr_norm, cv2.COLOR_BGR2GRAY)

    # Absolute difference
    diff_raw = cv2.absdiff(prev_gray, curr_gray)
    # Apply Gaussian smoothing to reduce sensor noise
    diff_smooth = cv2.GaussianBlur(diff_raw, (5, 5), 0)

    # Threshold to identify areas with noticeable change
    _, diff_thresh = cv2.threshold(diff_smooth, 28, 255, cv2.THRESH_BINARY)
    # Morphological opening to eliminate isolated pixel glitter
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
    diff_clean = cv2.morphologyEx(diff_thresh, cv2.MORPH_OPEN, kernel)

    change_pixels = int(np.sum(diff_clean > 0))
    total_pixels = h_p * w_p
    change_pct = round((change_pixels / float(total_pixels)) * 100.0, 2)

    # 4. Generate visual difference heatmap
    heatmap_colored = cv2.applyColorMap(diff_smooth, cv2.COLORMAP_JET)
    # Overlay heatmap onto current aligned image
    overlay = cv2.addWeighted(aligned_curr, 0.65, heatmap_colored, 0.35, 0)

    # Draw bounding boxes around significant change clusters
    cnts, _ = cv2.findContours(diff_clean, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    for c in cnts:
        if cv2.contourArea(c) > 300:
            x, y, w, h = cv2.boundingRect(c)
            cv2.rectangle(overlay, (x, y), (x + w, y + h), (0, 0, 255), 2)

    # 5. Classify change direction: improvement vs deterioration vs no significant change
    if change_pct < 2.5:
        status_label = "no_significant_change"
        summary = (
            f"No significant structural or surface deviation detected between intervals "
            f"(surface delta {change_pct}% is within typical illumination noise tolerance)."
        )
    else:
        # Check if the changed area became darker in current (indicates stain/mould/dampness growth)
        # or lighter (indicates drying / plastering / repainting)
        mask_bool = diff_clean > 0
        prev_mean = np.mean(prev_gray[mask_bool])
        curr_mean = np.mean(curr_gray[mask_bool])

        if curr_mean < prev_mean - 10:
            status_label = "deterioration"
            summary = (
                f"Visible surface deterioration detected ({change_pct}% surface delta). "
                f"Localized luminance darkening indicates potential moisture migration, stain expansion, or coating breakdown."
            )
        elif curr_mean > prev_mean + 10:
            status_label = "improvement"
            summary = (
                f"Visible surface improvement detected ({change_pct}% surface delta). "
                f"Localized luminance elevation indicates substrate drying, stain attenuation, or remedial repainting."
            )
        else:
            status_label = "deterioration"
            summary = (
                f"Noticeable surface pattern variation detected ({change_pct}% surface delta). "
                f"Morphological boundary shifts observed across monitored substrate."
            )

    prev_b64 = encode_image_to_base64_data_uri(prev_img, format_ext="jpg", quality=85)
    curr_b64 = encode_image_to_base64_data_uri(curr_resized, format_ext="jpg", quality=85)
    aligned_b64 = encode_image_to_base64_data_uri(aligned_curr, format_ext="jpg", quality=85)
    heatmap_b64 = encode_image_to_base64_data_uri(overlay, format_ext="jpg", quality=85)

    return DamageComparisonResult(
        comparison_id=f"CMP-{uuid.uuid4().hex[:8]}",
        property_id=property_id,
        inspection_zone=inspection_zone,
        previous_date=previous_date,
        current_date=current_date,
        change_status=status_label,
        change_percentage=change_pct,
        alignment_quality=align_qual,
        alignment_method=align_method,
        change_summary=summary,
        previous_image_url=prev_b64,
        current_image_url=curr_b64,
        aligned_current_url=aligned_b64,
        difference_heatmap_url=heatmap_b64,
        created_at=datetime.datetime.now(datetime.timezone.utc).isoformat(),
        scientific_disclaimer=(
            "Methodological Notice: Image comparison utilizes SIFT homographic registration and exposure normalization. "
            "However, differences in camera viewing angles, focal length distortion, or uneven illumination cannot be "
            "entirely eliminated by software. All detected changes should be confirmed by a physical surveyor."
        ),
    )
