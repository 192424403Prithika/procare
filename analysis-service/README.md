# PropCare NW — Diagnostic Optical Analysis Service

A high-performance Python FastAPI microservice that processes multi-modal inspection imagery (ambient baseline vs. on-axis flash illumination) using OpenCV and NumPy to detect visual anomalies associated with surface moisture.

## Architecture & Processing Pipeline

The 11-stage OpenCV optical pipeline:
1. **Secure Ingestion**: Ingests bytes, base64 data URIs, or remote HTTPS URLs.
2. **Input Validation**: Verifies 3-channel structure, non-corruption, and optical blur metrics (`Laplacian variance`).
3. **Proportional Resizing**: Scales inputs to a normalized 1024px maximum dimension for consistent spatial calculations.
4. **Feature Matching & Alignment**: Extracts SIFT/ORB keypoints and applies RANSAC homography/affine transformation to project flash imagery into the ambient coordinate system.
5. **Exposure Normalization**: Converts to CIE LAB and normalizes background lightness ($L^*$) to neutralize flash exposure gain on dry substrate.
6. **Multi-Scale Color Representation**: Converts to LAB and Grayscale for differential calculations.
7. **Differential Subtraction**: Computes specular reflectance difference: $I_{diff} = \max(0, I_{flash} - I_{ambient\_norm})$.
8. **Adaptive Thresholding & Morphological Cleaning**: Discards single-pixel camera noise and glints using morphological opening and closing.
9. **Connected Component Anomaly Extraction**: Identifies contours, calculating area, centroid, bounding boxes, mean intensity, and severity levels.
10. **False-Colour Heatmap & Composite Generation**: Maps difference values to false-color `COLORMAP_JET`, alpha-blends at 35% over the ambient image, and draws contour bounding boxes.
11. **Telemetry & Limitations Output**: Generates quantitative metrics, confidence score, and clear statutory disclaimers.

---

## Getting Started

### 1. Requirements
- Python 3.10+
- Dependencies listed in `requirements.txt`:
  ```bash
  pip install -r requirements.txt
  ```

### 2. Running Locally
Run the service with Uvicorn:
```bash
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

The service will be accessible at:
- **API Base**: `http://localhost:8000`
- **Interactive Swagger Docs**: `http://localhost:8000/docs`
- **Healthcheck**: `http://localhost:8000/health`

---

## API Endpoints

### 1. `POST /api/v1/analyze/moisture`
Accepts a JSON payload with ambient and flash image inputs (base64 or URLs):
```json
{
  "report_id": "INSP-2026-0914",
  "ambient_image": "data:image/jpeg;base64,...",
  "flash_image": "data:image/jpeg;base64,...",
  "sensitivity": 0.5
}
```

### 2. `POST /api/v1/analyze/moisture/upload`
Accepts `multipart/form-data`:
- `ambient_file`: Ambient image file (JPEG, PNG, WebP)
- `flash_file`: Flash image file (JPEG, PNG, WebP)
- `report_id`: (Optional) Inspection report UUID or code
- `sensitivity`: (Optional, float 0.1 - 1.0)

---

## Testing & Validation
Run the unit test suite:
```bash
python -m unittest tests/test_pipeline.py
```

Test cases covered:
1. Dry surface baseline (<1.5% difference, 0 false anomalies).
2. Different lighting conditions (exposure normalization validation).
3. Angle/perspective shifts (SIFT feature matching and homography alignment).
4. Visible damp patch detection (specular sheen clustering and heatmap generation).
5. Blurry or low-contrast input validation.
6. Empty/corrupt payload error handling.

---

## Limitations & Disclaimer

> **IMPORTANT**: This analysis is a **visual anomaly detection tool** based on surface specular sheen and attenuation disparities. It does **not** guarantee the presence or absence of concealed sub-surface moisture or active plumbing leaks. Gloss paint, glazed tiles, and reflective wallpaper can trigger false-positive specular highlights. Physical moisture meter probing and acoustic verification are required for statutory certification.
