# PropCare NW — YOLOv8 Moisture & Water Damage Detection Training Workflow

This directory contains the complete pipeline for training, validating, and exporting a custom **Ultralytics YOLOv8** model specialized in optical moisture defect recognition across residential and commercial buildings.

---

## 1. Supported Defect Classes

The training pipeline is configured for 8 specific moisture ingress and building degradation defect classes:

| Class ID | Class Name | Description | Severity Impact |
| :--- | :--- | :--- | :--- |
| `0` | `water_stain` | Discoloration rings or dried capillary moisture marks on walls/ceilings | Low / Moderate |
| `1` | `damp_patch` | Active capillary, hygroscopic, or penetrating dampness on substrate | High |
| `2` | `wall_moisture_damage` | Plaster crumbling, efflorescence, or substrate breakdown on vertical walls | High |
| `3` | `ceiling_water_damage` | Stains, sagging, or water pockets on ceiling boards indicating overhead leak | Critical |
| `4` | `peeling_paint` | Blistering, delamination, or flaking of surface paint films from dampness | Moderate |
| `5` | `visible_mould` | Visible fungal colonization (*Stachybotrys*, *Aspergillus*, *Cladosporium*) | Critical (Awaab's Law) |
| `6` | `leakage_mark` | Liquid flow trails or pipe penetration drip tracks | High |
| `7` | `plaster_deterioration` | Spalling, salt efflorescence, or structural crumbling of mineral plaster | Moderate |

---

## 2. Dataset Preparation & Folder Structure

To train the detector, organize your labelled dataset according to the standard YOLO directory hierarchy:

```
datasets/moisture_water_damage/
├── data.yaml
├── images/
│   ├── train/            # e.g., 2,500 training inspection photos (.jpg, .png)
│   ├── val/              # e.g., 500 validation inspection photos (.jpg, .png)
│   └── test/             # e.g., 250 evaluation photos (optional)
└── labels/
    ├── train/            # YOLO format .txt annotations for train images
    ├── val/              # YOLO format .txt annotations for val images
    └── test/             # YOLO format .txt annotations for test images
```

### YOLO Annotation Format
Each image has a corresponding `.txt` file with one row per detected defect bounding box:
```
<class_id> <x_center> <y_center> <width> <height>
```
*All coordinates are normalized to the interval `[0.0, 1.0]` relative to image width and height.*

Example `images/train/living_room_0042.jpg` ➔ `labels/train/living_room_0042.txt`:
```
5 0.428512 0.312840 0.184321 0.142500
1 0.612040 0.548210 0.320412 0.285100
```
*(Meaning: Class 5 `visible_mould` and Class 1 `damp_patch` located at respective bounding boxes).*

---

## 3. Dataset Sourcing, Licensing & Quality Control

> [!IMPORTANT]
> **Ethical & Quality Sourcing Guidelines:**
> Do NOT scrape unverified internet images or copyrighted surveyor photography without written permission.

### Recommended Data Sources:
1. **Housing Authority Field Surveys**: Anonymized inspection photographs captured during routine social housing maintenance audits (LGPS/Council housing stock).
2. **Roboflow Universe Building Defect Datasets**: Filter for datasets licensed under `CC BY 4.0` or `Public Domain` specifically targeting building masonry damp, plaster cracking, and mould.
3. **Mould / Efflorescence Scientific Repositories**: Research datasets published in scientific publications (e.g. Mendeley Data, Zenodo) focusing on indoor microbial contamination.

### Data Limitations:
- **Surface vs Substrate Moisture**: Visual RGB cameras detect *symptoms* of moisture (discoloration, fungal growth, paint peeling), not true subsurface volumetric water content. Calibrated physical pin meters or protimeters remain necessary for forensic moisture percentage readings.
- **Lighting Bias**: Low-light photos (e.g. dark under-stair crawlspaces) may produce higher false positives without illumination normalization augmentations (`hsv_v=0.4`).
- **Shadow Confounding**: Shadows cast by radiator pipes or furniture can visually resemble damp patches if annotations are not carefully reviewed.

---

## 4. Running Model Training

Run the automated Ultralytics training script:

```bash
python backend/training/train_moisture_yolo.py --data backend/training/data.yaml --base yolov8m.pt --epochs 100 --imgsz 640 --batch 16 --device 0
```

### Key Training Hyperparameters:
- `base`: `yolov8m.pt` (Recommended balance between inference speed and fine textural detail).
- `imgsz`: `640` (Preserves fine hairline mould hyphae and water tidemarks).
- `hsv_s`: `0.5` (Simulates variation in active capillary dampness).
- `patience`: `20` (Early stopping when validation mAP@50 plateaus).

---

## 5. Validating & Benchmarking the Model

Once training is complete, evaluate precision, recall, and mean Average Precision (mAP) on the held-out validation split:

```bash
python backend/training/validate_moisture_yolo.py --weights backend/models/moisture_best.pt --data backend/training/data.yaml
```

### Target Acceptance Metrics:
- **Precision (B)**: $\ge 0.82$
- **Recall (B)**: $\ge 0.78$
- **mAP@50**: $\ge 0.85$
- **mAP@50-95**: $\ge 0.62$

---

## 6. Deploying Model Weights to PropCare NW

When satisfied with the model benchmark:
1. The training script automatically copies `best.pt` to:
   ```
   backend/models/moisture_best.pt
   ```
2. If trained on an external workstation or Google Colab, copy your resulting checkpoint to:
   ```powershell
   copy path/to/your/best.pt backend/models/moisture_best.pt
   ```
3. Restart or reload the FastAPI backend.
4. Verify deployment at:
   ```
   http://127.0.0.1:8000/api/v1/analysis/moisture/model/status
   ```
   The endpoint will report `"configured": true`.
