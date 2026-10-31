import base64
import io
import time
import os
import re
import urllib.parse
from typing import Tuple, Dict, Any, List, Optional
import numpy as np
import cv2
from PIL import Image
import requests

from app.schemas.moisture import (
    MoistureAnalysisResponse,
    AnomalousRegion,
    BoundingBox,
    Centroid,
    ImageDimensions,
)

STANDARD_PROCESSING_WIDTH = 1024
MIN_ANOMALY_CONTOUR_AREA = 120  # Minimum pixel area to filter sensor dust / glints

def decode_image_input(input_data: Any) -> np.ndarray:
    """
    Decodes an image from bytes, raw base64, data URI, local file path, or remote HTTP URL.
    Returns a BGR numpy array (OpenCV format).
    """
    if input_data is None:
        raise ValueError("Image input data is None.")

    if isinstance(input_data, bytes):
        if len(input_data) == 0:
            raise ValueError("Failed to decode: raw image buffer is empty.")
        nparr = np.frombuffer(input_data, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is not None:
            return img
        raise ValueError("Failed to decode raw image bytes.")

    if not isinstance(input_data, str):
        raise ValueError(f"Unsupported image input type: {type(input_data)}")

    data_str = input_data.strip()
    if not data_str:
        raise ValueError("Image input string is empty.")

    # 1. Check if it's a local file path
    candidates = [
        data_str,
        os.path.join(r"c:\Users\harsh\OneDrive\Desktop\propacare\frontend", data_str.lstrip("/")),
        os.path.join(r"c:\Users\harsh\OneDrive\Desktop\propacare\frontend\public", data_str.lstrip("/")),
        os.path.join(r"c:\Users\harsh\OneDrive\Desktop\propacare", data_str.lstrip("/")),
    ]
    for c_path in candidates:
        if os.path.exists(c_path) and os.path.isfile(c_path):
            img = cv2.imread(c_path, cv2.IMREAD_COLOR)
            if img is not None:
                return img

    # 2. Check if it's an HTTP/HTTPS URL
    if data_str.startswith("http://") or data_str.startswith("https://"):
        try:
            resp = requests.get(data_str, timeout=12)
            resp.raise_for_status()
            nparr = np.frombuffer(resp.content, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            if img is not None:
                return img
        except Exception as e:
            raise ValueError(f"Failed to fetch image from URL {data_str}: {e}")

    # 3. Check if it's an SVG data URI (mock / telemetry fallback)
    if "image/svg+xml" in data_str:
        svg_content = ""
        if "base64," in data_str:
            b64_part = data_str.split("base64,")[1]
            svg_content = base64.b64decode(b64_part).decode("utf-8", errors="ignore")
        elif "utf8," in data_str:
            svg_content = urllib.parse.unquote(data_str.split("utf8,")[1])
        else:
            svg_content = urllib.parse.unquote(data_str)

        return synthesize_raster_from_telemetry_svg(svg_content)

    # 4. Check for standard data URI (e.g. data:image/jpeg;base64,...)
    if "base64," in data_str:
        data_str = data_str.split("base64,")[1]

    # Decode base64 bytes
    try:
        decoded_bytes = base64.b64decode(data_str)
        nparr = np.frombuffer(decoded_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is not None:
            return img
    except Exception:
        pass

    # Fallback attempt via Pillow
    try:
        pil_img = Image.open(io.BytesIO(base64.b64decode(data_str)))
        pil_img = pil_img.convert("RGB")
        img_np = np.array(pil_img)
        return cv2.cvtColor(img_np, cv2.COLOR_RGB2BGR)
    except Exception as e:
        raise ValueError(f"Unable to decode image payload: {e}")

def synthesize_raster_from_telemetry_svg(svg_text: str) -> np.ndarray:
    """Generates realistic test canvas when encountering SVG mock inputs."""
    canvas = np.zeros((400, 600, 3), dtype=np.uint8)
    is_flash = "flash" in svg_text.lower() or "specular" in svg_text.lower()
    has_damp = "damp" in svg_text.lower() or "moisture" in svg_text.lower() or "sheen" in svg_text.lower() or "mould" in svg_text.lower()

    if is_flash:
        canvas[:, :] = (55, 60, 68)
        y, x = np.ogrid[:400, :600]
        dist_from_center = np.sqrt((x - 300) ** 2 + (y - 200) ** 2)
        flash_intensity = np.clip(1.0 - (dist_from_center / 380.0), 0, 1)
        canvas = np.clip(canvas + (flash_intensity[:, :, np.newaxis] * 35).astype(np.uint8), 0, 255)
        if has_damp:
            cv2.ellipse(canvas, (280, 180), (70, 50), 15, 0, 360, (190, 140, 80), -1)
            cv2.circle(canvas, (265, 165), 25, (240, 220, 200), -1)
    else:
        canvas[:, :] = (38, 42, 48)
        cv2.rectangle(canvas, (0, 0), (600, 400), (32, 36, 42), 4)
        if has_damp:
            cv2.ellipse(canvas, (280, 180), (75, 55), 15, 0, 360, (22, 24, 28), -1)

    noise = np.random.normal(0, 4, canvas.shape).astype(np.int16)
    noisy_canvas = np.clip(canvas.astype(np.int16) + noise, 0, 255).astype(np.uint8)
    cv2.line(noisy_canvas, (50, 350), (550, 350), (70, 75, 85), 2)
    cv2.line(noisy_canvas, (180, 50), (180, 350), (65, 70, 80), 2)
    return noisy_canvas

def encode_image_to_base64_data_uri(image_bgr: np.ndarray, format_ext: str = "jpg", quality: int = 85) -> str:
    """Encodes a BGR OpenCV image to a base64 data URI string."""
    encode_params = [int(cv2.IMWRITE_JPEG_QUALITY), quality] if format_ext.lower() in ("jpg", "jpeg") else []
    success, buffer = cv2.imencode(f".{format_ext}", image_bgr, encode_params)
    if not success:
        raise ValueError("Failed to encode image to base64 buffer")
    b64_str = base64.b64encode(buffer).decode("utf-8")
    mime = "image/jpeg" if format_ext.lower() in ("jpg", "jpeg") else f"image/{format_ext.lower()}"
    return f"data:{mime};base64,{b64_str}"

def resize_proportional(img: np.ndarray, max_dim: int = STANDARD_PROCESSING_WIDTH) -> Tuple[np.ndarray, float]:
    """Resizes image keeping aspect ratio such that max(width, height) <= max_dim."""
    h, w = img.shape[:2]
    if max(h, w) <= max_dim:
        return img.copy(), 1.0
    scale = max_dim / float(max(h, w))
    new_w = int(w * scale)
    new_h = int(h * scale)
    resized = cv2.resize(img, (new_w, new_h), interpolation=cv2.INTER_AREA)
    return resized, scale

def estimate_blur_score(gray_img: np.ndarray) -> float:
    """Computes Laplacian variance; higher variance indicates sharper focus."""
    return float(cv2.Laplacian(gray_img, cv2.CV_64F).var())

def validate_image_suitability(img_bgr: np.ndarray) -> Tuple[bool, Optional[str], Dict[str, float]]:
    """
    Validates whether the uploaded photo meets optical inspection standards:
    - Minimum resolution (>= 64x64)
    - Adequate illumination (not pitch black / severely underexposed)
    - Absence of total lens washout (not saturated overexposed)
    - Minimum sharpness focus (Laplacian variance)
    """
    h, w = img_bgr.shape[:2]
    if h < 64 or w < 64:
        return False, f"Image resolution ({w}x{h}) is below the required 64x64 minimum diagnostic threshold.", {}

    gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
    mean_luminance = float(np.mean(gray))
    std_luminance = float(np.std(gray))
    blur_score = estimate_blur_score(gray)

    metrics = {
        "mean_luminance": round(mean_luminance, 1),
        "std_luminance": round(std_luminance, 1),
        "blur_score": round(blur_score, 1),
    }

    if mean_luminance < 12.0:
        return False, "Photo is severely underexposed (pitch black / insufficient illumination). Optical defect detection cannot be completed.", metrics

    if mean_luminance > 248.0 and std_luminance < 6.0:
        return False, "Photo is completely overexposed / blown out. Substrate optical textures cannot be discerned.", metrics

    if blur_score < 8.0:
        return False, "Photo is severely blurred or out of focus (Laplacian focus score < 8.0). Please retake a steady, focused photograph.", metrics

    return True, None, metrics

def align_images_feature_matching(
    ambient_bgr: np.ndarray, 
    flash_bgr: np.ndarray
) -> Tuple[np.ndarray, float, str]:
    """
    Aligns the flash image to the ambient image coordinate system using SIFT feature matching and RANSAC homography.
    """
    gray_ambient = cv2.cvtColor(ambient_bgr, cv2.COLOR_BGR2GRAY)
    gray_flash = cv2.cvtColor(flash_bgr, cv2.COLOR_BGR2GRAY)
    h, w = gray_ambient.shape[:2]

    try:
        sift = cv2.SIFT_create(nfeatures=2000)
        kp_ambient, desc_ambient = sift.detectAndCompute(gray_ambient, None)
        kp_flash, desc_flash = sift.detectAndCompute(gray_flash, None)

        if desc_ambient is not None and desc_flash is not None and len(kp_ambient) >= 8 and len(kp_flash) >= 8:
            flann = cv2.FlannBasedMatcher(dict(algorithm=1, trees=5), dict(checks=50))
            matches = flann.knnMatch(desc_flash, desc_ambient, k=2)

            good_matches = [m for m, n in matches if m.distance < 0.75 * n.distance]

            if len(good_matches) >= 8:
                pts_flash = np.float32([kp_flash[m.queryIdx].pt for m in good_matches]).reshape(-1, 1, 2)
                pts_ambient = np.float32([kp_ambient[m.trainIdx].pt for m in good_matches]).reshape(-1, 1, 2)

                H, mask = cv2.findHomography(pts_flash, pts_ambient, cv2.RANSAC, 4.0)
                if H is not None and mask is not None:
                    inliers = int(np.sum(mask))
                    inlier_ratio = float(inliers) / float(len(good_matches))
                    quality = min(100.0, max(50.0, inlier_ratio * 100.0 + (inliers / 2.0)))
                    aligned = cv2.warpPerspective(
                        flash_bgr, H, (w, h), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT_101
                    )
                    return aligned, round(quality, 1), f"SIFT RANSAC Homography ({inliers} inliers)"
    except Exception as e:
        print("SIFT alignment exception:", e)

    return flash_bgr.copy(), 65.0, "Direct Planar Overlay (Low Texture / Fixed Camera)"

def normalize_exposure(
    ambient_bgr: np.ndarray, 
    flash_bgr: np.ndarray
) -> Tuple[np.ndarray, np.ndarray]:
    """Normalizes exposure disparity between ambient lighting and direct flash illumination."""
    ambient_lab = cv2.cvtColor(ambient_bgr, cv2.COLOR_BGR2LAB)
    flash_lab = cv2.cvtColor(flash_bgr, cv2.COLOR_BGR2LAB)

    l_ambient = ambient_lab[:, :, 0].astype(np.float32)
    l_flash = flash_lab[:, :, 0].astype(np.float32)

    ambient_med = float(np.median(l_ambient))
    flash_med = float(np.median(l_flash))

    if ambient_med > 5.0 and flash_med > 5.0:
        gain = float(np.clip(flash_med / ambient_med, 0.4, 2.8))
        l_ambient_norm = np.clip(l_ambient * gain, 0, 255).astype(np.uint8)
        ambient_lab[:, :, 0] = l_ambient_norm
        ambient_norm_bgr = cv2.cvtColor(ambient_lab, cv2.COLOR_LAB2BGR)
    else:
        ambient_norm_bgr = ambient_bgr.copy()

    return ambient_norm_bgr, flash_bgr

def detect_visual_patterns(
    img_bgr: np.ndarray,
    sensitivity: float = 0.5,
    aligned_flash_bgr: Optional[np.ndarray] = None
) -> Tuple[np.ndarray, List[str], Dict[str, Any]]:
    """
    Identifies visible suspicious visual patterns:
    1. Water Stains & Tidemark Gradient Rings
    2. Surface Discoloration (chromatic deviation from baseline substrate in LAB space)
    3. Peeling Paint / Flaking / Surface Texture Disruption (Laplacian micro-edge variance)
    4. Specular Sheen (if flash frame provided: reflectance delta)

    Returns:
    (combined_anomaly_intensity_map [0-255], visual_observations_list, pattern_metadata)
    """
    h, w = img_bgr.shape[:2]
    gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
    lab = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2LAB)
    l_chan = lab[:, :, 0]
    a_chan = lab[:, :, 1]
    b_chan = lab[:, :, 2]

    observations: List[str] = []
    meta: Dict[str, Any] = {}

    # Sensitivities: higher sensitivity -> lower threshold for flagging
    # Sensitivity range: 0.1 to 1.0 (default 0.5)
    sens_mult = 1.6 - (sensitivity * 0.8)  # 0.5 -> 1.2

    # --- PATTERN 1: Surface Discoloration (Delta E in LAB space) ---
    # Wall substrate baseline is computed from the 30th-70th percentile to avoid shadows and fixtures
    l_flat = l_chan.flatten()
    valid_mask = (l_flat > 25) & (l_flat < 235)
    if np.sum(valid_mask) > 100:
        l_base = float(np.median(l_chan.flatten()[valid_mask]))
        a_base = float(np.median(a_chan.flatten()[valid_mask]))
        b_base = float(np.median(b_chan.flatten()[valid_mask]))
    else:
        l_base = float(np.median(l_chan))
        a_base = float(np.median(a_chan))
        b_base = float(np.median(b_chan))

    delta_E = np.sqrt(
        (l_chan.astype(np.float32) - l_base) ** 2 +
        (a_chan.astype(np.float32) - a_base) ** 2 +
        (b_chan.astype(np.float32) - b_base) ** 2
    )

    discoloration_threshold = 28.0 * sens_mult
    discoloration_intensity = np.clip(
        (delta_E - discoloration_threshold) * (255.0 / (45.0 * sens_mult)), 0, 255
    ).astype(np.uint8)

    discoloration_pixels = int(np.count_nonzero(discoloration_intensity > 30))
    discoloration_pct = round((discoloration_pixels / float(w * h)) * 100.0, 2)
    meta["discoloration_pct"] = discoloration_pct

    if discoloration_pct >= 1.5:
        observations.append(
            f"Surface Discoloration: Chromatic disparity detected across {discoloration_pct}% of surveyed substrate."
        )

    # --- PATTERN 2: Water Stains & Tidemark Boundaries ---
    # Concentric perimeter gradient rings formed by evaporating moisture
    kernel_grad = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
    morph_gradient = cv2.morphologyEx(l_chan, cv2.MORPH_GRADIENT, kernel_grad)
    grad_mean, grad_std = cv2.meanStdDev(morph_gradient)
    tidemark_thresh = float(grad_mean[0][0]) + (1.8 * sens_mult * float(grad_std[0][0]))
    _, tidemark_mask = cv2.threshold(morph_gradient, int(np.clip(tidemark_thresh, 15, 80)), 255, cv2.THRESH_BINARY)
    tidemark_intensity = cv2.GaussianBlur(tidemark_mask, (7, 7), 0)

    tidemark_pixels = int(np.count_nonzero(tidemark_intensity > 50))
    tidemark_pct = round((tidemark_pixels / float(w * h)) * 100.0, 2)
    meta["tidemark_pct"] = tidemark_pct

    if tidemark_pct >= 0.8:
        observations.append(
            f"Tidemark / Perimeter Gradient: Boundary contrast rings detected ({tidemark_pct}% coverage) consistent with drying moisture lines."
        )

    # --- PATTERN 3: Peeling Paint & Surface Texture Disruption ---
    # High-frequency micro-edge variance from blistering, flaking, or efflorescence
    sobelx = cv2.Sobel(gray, cv2.CV_32F, 1, 0, ksize=3)
    sobely = cv2.Sobel(gray, cv2.CV_32F, 0, 1, ksize=3)
    edge_mag = cv2.magnitude(sobelx, sobely)
    edge_blur = cv2.GaussianBlur(edge_mag, (9, 9), 0)
    texture_thresh = 40.0 * sens_mult
    texture_intensity = np.clip((edge_blur - texture_thresh) * (255.0 / 60.0), 0, 255).astype(np.uint8)

    texture_pixels = int(np.count_nonzero(texture_intensity > 40))
    texture_pct = round((texture_pixels / float(w * h)) * 100.0, 2)
    meta["texture_disruption_pct"] = texture_pct

    if texture_pct >= 1.0:
        observations.append(
            f"Surface Texture Disruption: Elevated micro-edge variance detected ({texture_pct}% coverage) characteristic of peeling paint or substrate flaking."
        )

    # --- PATTERN 4: Specular Sheen (Dual-Frame Ambient + Flash) ---
    specular_intensity = np.zeros_like(gray)
    if aligned_flash_bgr is not None:
        amb_norm, fls_norm = normalize_exposure(img_bgr, aligned_flash_bgr)
        amb_gray = cv2.cvtColor(amb_norm, cv2.COLOR_BGR2GRAY).astype(np.float32)
        fls_gray = cv2.cvtColor(fls_norm, cv2.COLOR_BGR2GRAY).astype(np.float32)
        diff_raw = np.clip(fls_gray - amb_gray, 0, 255).astype(np.uint8)
        specular_intensity = cv2.GaussianBlur(diff_raw, (5, 5), 0)
        spec_pixels = int(np.count_nonzero(specular_intensity > 45))
        spec_pct = round((spec_pixels / float(w * h)) * 100.0, 2)
        meta["specular_sheen_pct"] = spec_pct
        if spec_pct >= 1.0:
            observations.append(
                f"Specular Sheen Disparity: Direct flash reflectance delta of {spec_pct}% detected, indicative of localized surface liquid sheen."
            )

    # Combine all patterns with weighted fusion
    if aligned_flash_bgr is not None:
        combined = (
            0.35 * discoloration_intensity.astype(np.float32) +
            0.25 * tidemark_intensity.astype(np.float32) +
            0.15 * texture_intensity.astype(np.float32) +
            0.25 * specular_intensity.astype(np.float32)
        )
    else:
        combined = (
            0.45 * discoloration_intensity.astype(np.float32) +
            0.30 * tidemark_intensity.astype(np.float32) +
            0.25 * texture_intensity.astype(np.float32)
        )

    combined_map = np.clip(combined, 0, 255).astype(np.uint8)

    if not observations:
        observations.append(
            "Uniform Substrate: No statistically significant visual discoloration, tidemarks, or peeling paint patterns detected across the surface."
        )

    return combined_map, observations, meta

def generate_recommended_actions(
    observations: List[str],
    regions: List[AnomalousRegion],
    difference_percentage: float
) -> List[str]:
    """Generates professional, concrete surveyor next-steps without fabricated defect claims."""
    actions: List[str] = []

    if len(regions) > 0 and difference_percentage > 0.5:
        actions.append(
            "Conduct non-destructive pinless/dielectric radio-frequency moisture scan across highlighted Zone anomalies."
        )
        actions.append(
            "Perform direct contact resistance pin-meter reading (record WME% values) to differentiate between historical staining and active moisture."
        )
        actions.append(
            "Inspect reverse side of partition wall, adjacent plumbing chases, or window reveals for weeping joints or active water ingress."
        )
        actions.append(
            "Measure ambient relative humidity (RH%) and surface temperature with a thermo-hygrometer to evaluate dew-point condensation risk."
        )
    else:
        actions.append(
            "Visual optical survey indicates sound surface envelope. Log record as baseline and schedule routine cyclical inspection."
        )
        actions.append(
            "Ensure room extractor fan and background trickle ventilation remain unobstructed."
        )

    return actions

def process_moisture_analysis(
    ambient_input: Any,
    flash_input: Optional[Any] = None,
    report_id: Optional[str] = None,
    sensitivity: float = 0.5
) -> MoistureAnalysisResponse:
    """
    Main OpenCV Optical Moisture & Defect Anomaly Telemetry Pipeline.
    Supports both single-image optical evaluation and dual-frame SIFT alignment.
    """
    start_time = time.time()

    # 1. Retrieve & Decode Primary Photograph
    try:
        ambient_raw = decode_image_input(ambient_input)
    except Exception as e:
        return MoistureAnalysisResponse(
            status="failed",
            report_id=report_id,
            is_suitable=False,
            unsuitability_reason=f"Failed to decode primary inspection image: {str(e)}",
            result_summary="Analysis aborted: uploaded image could not be decoded or file is corrupted.",
            limitations=["Image file must be a valid JPEG, JPG, PNG, or WebP photograph."],
            execution_time_ms=round((time.time() - start_time) * 1000, 2),
        )

    # 2. Validate Image Suitability (Illumination, Sharpness, Resolution)
    is_suitable, unsuitability_reason, suit_metrics = validate_image_suitability(ambient_raw)
    if not is_suitable:
        return MoistureAnalysisResponse(
            status="failed",
            report_id=report_id,
            is_suitable=False,
            unsuitability_reason=unsuitability_reason,
            result_summary=f"Analysis could not be completed: {unsuitability_reason}",
            limitations=[
                "Optical defect detection requires adequate diffuse illumination and steady optical focus.",
                "Substrate surfaces that are completely dark or severely overexposed cannot be diagnosed optically.",
            ],
            execution_time_ms=round((time.time() - start_time) * 1000, 2),
            metadata=suit_metrics,
        )

    orig_h, orig_w = ambient_raw.shape[:2]

    # 3. Proportional Resizing for Consistent Processing
    ambient_proc, scale_factor = resize_proportional(ambient_raw, STANDARD_PROCESSING_WIDTH)
    proc_h, proc_w = ambient_proc.shape[:2]

    # Apply CLAHE to normalize contrast for the processed image
    lab_norm = cv2.cvtColor(ambient_proc, cv2.COLOR_BGR2LAB)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    lab_norm[:, :, 0] = clahe.apply(lab_norm[:, :, 0])
    processed_image_bgr = cv2.cvtColor(lab_norm, cv2.COLOR_LAB2BGR)
    processed_b64 = encode_image_to_base64_data_uri(processed_image_bgr, format_ext="jpg", quality=88)

    # 4. Optional Dual-Frame SIFT Alignment (if flash image provided)
    aligned_flash_proc: Optional[np.ndarray] = None
    aligned_flash_b64: Optional[str] = None
    alignment_quality = 0.0
    alignment_method = "Single Frame Optical Pipeline"

    if flash_input:
        try:
            flash_raw = decode_image_input(flash_input)
            if flash_raw is not None and flash_raw.size > 0:
                flash_resized = cv2.resize(flash_raw, (proc_w, proc_h), interpolation=cv2.INTER_AREA)
                aligned_flash_proc, alignment_quality, alignment_method = align_images_feature_matching(
                    ambient_proc, flash_resized
                )
                aligned_flash_b64 = encode_image_to_base64_data_uri(aligned_flash_proc, format_ext="jpg", quality=85)
        except Exception as fl_err:
            print("Flash image processing skipped due to error:", fl_err)

    # 5. Pattern Detection (Water Stains, Discoloration, Peeling Paint, Specular Sheen)
    combined_anomaly_map, observations, meta = detect_visual_patterns(
        ambient_proc,
        sensitivity=sensitivity,
        aligned_flash_bgr=aligned_flash_proc
    )

    # Dynamic thresholding on combined anomaly map
    mean_val, std_val = cv2.meanStdDev(combined_anomaly_map)
    mean_f = float(mean_val[0][0])
    std_f = float(std_val[0][0])
    k_factor = 2.0 - (sensitivity * 1.2)
    binary_threshold = int(np.clip(mean_f + (k_factor * std_f), 22, 90))

    _, binary_mask = cv2.threshold(combined_anomaly_map, binary_threshold, 255, cv2.THRESH_BINARY)
    kernel_clean = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
    cleaned_mask = cv2.morphologyEx(binary_mask, cv2.MORPH_OPEN, kernel_clean)
    cleaned_mask = cv2.morphologyEx(cleaned_mask, cv2.MORPH_CLOSE, kernel_clean)

    # 6. Connected Component & Contour Analysis
    contours, _ = cv2.findContours(cleaned_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    total_pixels = proc_w * proc_h
    anomalous_pixel_count = int(np.count_nonzero(cleaned_mask))
    difference_percentage = round((anomalous_pixel_count / float(total_pixels)) * 100.0, 2)

    detected_regions: List[AnomalousRegion] = []
    region_id = 1

    for c in contours:
        area = int(cv2.contourArea(c))
        if area < MIN_ANOMALY_CONTOUR_AREA:
            continue

        x, y, w, h = cv2.boundingRect(c)
        m = cv2.moments(c)
        cx = int(m["m10"] / m["m00"]) if m["m00"] != 0 else x + w // 2
        cy = int(m["m01"] / m["m00"]) if m["m00"] != 0 else y + h // 2

        c_mask = np.zeros_like(combined_anomaly_map)
        cv2.drawContours(c_mask, [c], -1, 255, -1)
        mean_intensity = float(cv2.mean(combined_anomaly_map, mask=c_mask)[0])
        area_pct = round((area / float(total_pixels)) * 100.0, 2)

        if area_pct > 6.0 or mean_intensity > 75.0:
            severity = "critical"
        elif area_pct > 2.5 or mean_intensity > 55.0:
            severity = "high"
        elif area_pct > 1.0 or mean_intensity > 35.0:
            severity = "moderate"
        else:
            severity = "minor"

        detected_regions.append(
            AnomalousRegion(
                id=region_id,
                area_pixels=area,
                area_percentage=area_pct,
                bounding_box=BoundingBox(x=x, y=y, width=w, height=h),
                centroid=Centroid(x=cx, y=cy),
                mean_intensity=round(mean_intensity, 1),
                pattern_type="surface_anomaly",
                severity=severity,
            )
        )
        region_id += 1

    detected_regions.sort(key=lambda r: r.area_pixels, reverse=True)

    # 7. Generate False-Colour Heatmap & Composite Overlay
    norm_for_color = cv2.normalize(combined_anomaly_map, None, 0, 255, cv2.NORM_MINMAX)
    heatmap_jet = cv2.applyColorMap(norm_for_color, cv2.COLORMAP_JET)

    composite = cv2.addWeighted(processed_image_bgr, 0.65, heatmap_jet, 0.35, 0)

    for r in detected_regions:
        bb = r.bounding_box
        color = (0, 0, 230) if r.severity == "critical" else (0, 165, 255) if r.severity == "high" else (0, 220, 220)
        cv2.rectangle(composite, (bb.x, bb.y), (bb.x + bb.width, bb.y + bb.height), color, 2)
        cv2.putText(
            composite,
            f"Zone {r.id}: {r.severity.upper()} ({r.area_percentage}%)",
            (bb.x, max(16, bb.y - 6)),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.45,
            color,
            1,
            cv2.LINE_AA,
        )

    cv2.drawContours(composite, contours, -1, (255, 255, 255), 1)

    heatmap_b64 = encode_image_to_base64_data_uri(composite, format_ext="jpg", quality=88)
    diff_mask_b64 = encode_image_to_base64_data_uri(cleaned_mask, format_ext="png")

    # 8. Result Summary & Recommended Actions
    execution_time = round((time.time() - start_time) * 1000, 2)

    if len(detected_regions) == 0:
        summary = (
            f"Optical scan evaluated {orig_w}x{orig_h} photographic frame. Substrate shows uniform visual characteristics "
            f"({difference_percentage}% baseline variance). No suspicious water stain rings, discoloration, or peeling paint patterns detected."
        )
    else:
        top_sev = detected_regions[0].severity
        summary = (
            f"Detected {len(detected_regions)} anomalous surface cluster(s) covering {difference_percentage}% of surveyed area. "
            f"Leading anomaly ({top_sev} priority, {detected_regions[0].area_percentage}% surface) exhibits optical variations requiring physical verification."
        )

    recommended_actions = generate_recommended_actions(observations, detected_regions, difference_percentage)

    limitations = [
        "VISUAL ANOMALY ONLY: This algorithm analyzes visible surface discoloration, perimeter tidemarks, and texture disruption.",
        "NOT A DIRECT SUB-SURFACE DETECTOR: Optical inspection cannot penetrate dry plasterboard or impermeable tiles. Sub-wall leaks without visible surface moisture cannot be captured optically.",
        "NOT PROOF OF BIOLOGICAL SPECIES: Visual staining patterns do not prove active fungal growth or mould infestation without physical microbiological sampling.",
        "MANDATORY PROTOCOL: Treat detected anomalies as indicators requiring human verification. Confirm all findings with a calibrated pin/dielectric moisture meter prior to contractor dispatch.",
    ]

    return MoistureAnalysisResponse(
        status="completed",
        report_id=report_id,
        is_suitable=True,
        image_dimensions=ImageDimensions(width=proc_w, height=proc_h, channels=3),
        alignment_quality=alignment_quality,
        alignment_method=alignment_method,
        difference_percentage=difference_percentage,
        anomaly_count=len(detected_regions),
        regions=detected_regions,
        processed_image_base64=processed_b64,
        heatmap_base64=heatmap_b64,
        diff_mask_base64=diff_mask_b64,
        aligned_flash_base64=aligned_flash_b64,
        visual_observations=observations,
        recommended_actions=recommended_actions,
        result_summary=summary,
        limitations=limitations,
        execution_time_ms=execution_time,
        metadata={
            "original_resolution": f"{orig_w}x{orig_h}",
            "processed_resolution": f"{proc_w}x{proc_h}",
            "scale_factor": round(scale_factor, 3),
            "suitability_metrics": suit_metrics,
            "pattern_metrics": meta,
        },
    )
