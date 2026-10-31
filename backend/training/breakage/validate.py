"""
PropCare NW — Structural Breakage YOLOv8 Model Validation Script
Evaluates trained weights on test/validation building defect splits.
Reports:
  - Precision (P)
  - Recall (R)
  - mAP50
  - mAP50-95
  - Per-class performance
  - Confusion matrix
"""

import sys
import argparse
from pathlib import Path
from ultralytics import YOLO

BACKEND_DIR = Path(__file__).resolve().parents[2]
DEFAULT_WEIGHTS = BACKEND_DIR / "models" / "breakage_best.pt"
DEFAULT_DATA = Path(__file__).resolve().parent / "data.yaml"


def parse_args():
    parser = argparse.ArgumentParser(description="Validate YOLO Structural Breakage Model")
    parser.add_argument("--weights", type=str, default=str(DEFAULT_WEIGHTS), help="Path to trained weights .pt")
    parser.add_argument("--data", type=str, default=str(DEFAULT_DATA), help="Path to data.yaml")
    parser.add_argument("--imgsz", type=int, default=416, help="Validation image size")
    parser.add_argument("--device", type=str, default="cpu", help="Device (cpu or 0)")
    return parser.parse_args()


def validate():
    args = parse_args()
    weights_path = Path(args.weights).resolve()
    data_path = Path(args.data).resolve()

    print("=" * 65)
    print("PROPCARE NW — YOLO STRUCTURAL BREAKAGE MODEL VALIDATION")
    print(f"Model weights: {weights_path}")
    print(f"Dataset config: {data_path}")
    print("=" * 65)

    if not weights_path.exists():
        print(f"ERROR: Model weights file not found at {weights_path}!")
        print("Please train the model first or configure BREAKAGE_YOLO_MODEL_PATH.")
        sys.exit(1)

    model = YOLO(str(weights_path))
    metrics = model.val(
        data=str(data_path),
        imgsz=args.imgsz,
        device=args.device,
        project="runs/breakage_val",
        name="val_eval",
        exist_ok=True,
        plots=True
    )

    print("\n" + "=" * 65)
    print("VALIDATION BENCHMARK RESULTS")
    print("=" * 65)

    try:
        mp = float(metrics.box.mp)
        mr = float(metrics.box.mr)
        map50 = float(metrics.box.map50)
        map50_95 = float(metrics.box.map)
        print(f"| Metric       | Value   | Percentage |")
        print(f"|--------------|---------|------------|")
        print(f"| Precision    | {mp:.4f}  | {mp*100:6.2f}%    |")
        print(f"| Recall       | {mr:.4f}  | {mr*100:6.2f}%    |")
        print(f"| mAP@50       | {map50:.4f}  | {map50*100:6.2f}%    |")
        print(f"| mAP@50-95    | {map50_95:.4f}  | {map50_95*100:6.2f}%    |")

        # Per-class metrics
        print("\nPER-CLASS PERFORMANCE:")
        print(f"{'Class ID':<10} {'Class Name':<25} {'Precision':<12} {'Recall':<12} {'mAP50':<12}")
        print("-" * 75)
        names = model.names
        for cls_id in metrics.box.ap_class_index:
            c_name = names.get(cls_id, f"class_{cls_id}")
            p_val = metrics.box.p[cls_id] if hasattr(metrics.box, "p") and len(metrics.box.p) > cls_id else 0.0
            r_val = metrics.box.r[cls_id] if hasattr(metrics.box, "r") and len(metrics.box.r) > cls_id else 0.0
            ap50_val = metrics.box.ap50[cls_id] if hasattr(metrics.box, "ap50") and len(metrics.box.ap50) > cls_id else 0.0
            print(f"{cls_id:<10} {c_name:<25} {float(p_val):<12.4f} {float(r_val):<12.4f} {float(ap50_val):<12.4f}")

    except Exception as e:
        print(f"Error parsing detailed box metrics: {e}")

    print("\n" + "=" * 65)
    print(f"Validation plots and Confusion Matrix saved to: {metrics.save_dir}")
    print("=" * 65)


if __name__ == "__main__":
    validate()
