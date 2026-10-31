# PropCare NW — YOLO Structural Breakage & Building Damage Detection Pipeline

Production-ready computer vision pipeline using **Ultralytics YOLOv8** and **OpenCV** to detect structural damage, wall cracks, fractures, concrete spalling, and surface building defects in PropCare NW.

---

## 1. Defect Class Taxonomy & Class ID Mapping

The model pipeline supports 12 standardized building defect categories:

| Class ID | Defect Class | Damage Nature | Severity Range | Requires Structural Assessment |
|----------|--------------|---------------|----------------|--------------------------------|
| `0` | `wall_crack` | Cosmetic / Minor | Minor – Moderate | If > 5mm width or diagonal shear |
| `1` | `ceiling_crack` | Cosmetic / Plaster | Minor – Moderate | If deflection or sagging present |
| `2` | `structural_fracture` | **Suspected Structural** | **Major – Critical** | **Yes (Mandatory)** |
| `3` | `broken_plaster` | Surface degradation | Minor – Moderate | No |
| `4` | `broken_tiles` | Finish degradation | Minor | No |
| `5` | `concrete_spalling` | **Suspected Structural** | **Major – Critical** | **Yes (Mandatory)** |
| `6` | `exposed_rebar` | **Suspected Structural** | **Critical** | **Yes (Immediate Safety Hazard)** |
| `7` | `damaged_wall_surface` | Surface impact | Minor – Moderate | No |
| `8` | `broken_masonry` | **Suspected Structural** | **Major – Critical** | **Yes (Mandatory)** |
| `9` | `damaged_ceiling` | Interior lining | Minor – Moderate | If structural joists exposed |
| `10` | `surface_holes_impact` | Mechanical impact | Minor – Moderate | No |
| `11` | `damaged_door_window_frame`| Structural aperture | Moderate – Major | If lintel failure suspected |

---

## 2. Dataset Source & Licensing

- **Primary Source**: Roboflow Universe *Building Defects v1*
- **License**: Creative Commons Attribution 4.0 International (**CC BY 4.0**)
- **Data Composition**: 97 real high-resolution photographs of masonry cracks, concrete shear lines, foundation cracks, and building envelope damage.
- **Format**: Converted from COCO segmentation format into normalized YOLO bounding box format `[class_id, x_center, y_center, width, height]`.
- **Class Coverage Note**: As required by the engineering specification, only classes with verified labelled training examples are claimed. The active dataset focuses on wall cracks, concrete spalling, masonry damage, and structural fractures. Additional defect categories can be incrementally added following the instructions below.

---

## 3. Dataset Directory Layout

The pipeline strictly adheres to the Ultralytics YOLO dataset format:

```text
backend/training/breakage/
├── data.yaml                     # Ultralytics dataset specification
├── prepare_dataset.py            # COCO to YOLO conversion script
├── train.py                      # Training loop with metric reporting
├── validate.py                   # Benchmark evaluation script (mAP50, mAP50-95)
├── predict.py                    # Real test image inference CLI
├── README.md                     # This documentation
└── dataset/
    ├── images/
    │   ├── train/                # Training photographs (.jpg, .png)
    │   └── val/                  # Validation photographs
    └── labels/
        ├── train/                # Normalized YOLO labels (.txt)
        └── val/                  # Validation labels
```

---

## 4. Dataset Preparation & Labelling Instructions

### 4.1 Running the Automated Converter

To prepare the dataset from the repository source:

```bash
& "C:\Users\Patan Afrin\.pvenv\Scripts\python.exe" backend/training/breakage/prepare_dataset.py
```

### 4.2 Annotating New Building Defect Photographs

When labelling new defect images in Roboflow, Label Studio, or CVAT:
1. Draw bounding boxes tightly bounding the defect.
2. Label format for each bounding box:
   `<class_id> <x_center> <y_center> <width> <height>` (all coordinates normalized to 0.0 – 1.0).
3. Distinguish cosmetic hairline cracks (< 1mm) from structural shear fractures (> 5mm or diagonal staircase cracking through brickwork).

---

## 5. Model Training

Run the training script:

```bash
& "C:\Users\Patan Afrin\.pvenv\Scripts\python.exe" backend/training/breakage/train.py --epochs 20 --batch 16 --imgsz 416 --device cpu
```

The script:
1. Loads the base YOLOv8 architecture (`yolov8n.pt`).
2. Trains on the structural breakage training set.
3. Automatically exports the top checkpoint to `backend/models/breakage_best.pt`.
4. Computes Precision, Recall, mAP50, mAP50-95, per-class performance, and confusion matrix.

---

## 6. Model Evaluation & Benchmark Validation

Run the benchmark evaluation:

```bash
& "C:\Users\Patan Afrin\.pvenv\Scripts\python.exe" backend/training/breakage/validate.py --weights backend/models/breakage_best.pt
```

The script reports:
- Mean Precision (P)
- Mean Recall (R)
- mAP@50 and mAP@50-95
- Per-class breakdown
- Confusion matrix saved in `runs/breakage_val/`

---

## 7. CLI Inference on Building Photographs

To test inference on an arbitrary building damage photograph:

```bash
& "C:\Users\Patan Afrin\.pvenv\Scripts\python.exe" backend/training/breakage/predict.py --image "path/to/damage_photo.jpg" --conf 0.25
```

---

## 8. Important Engineering & Safety Disclaimer

> **MANDATORY SAFETY DISCLAIMER:**  
> AI image analysis identifies visible damage indicators from photographic evidence. It does **not** establish structural integrity or determine whether a building is safe. Any major or critical findings require on-site assessment by a qualified structural engineer.
