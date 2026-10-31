"""
PropCare NW — Ultralytics YOLOv8 Moisture & Water Damage Validation Pipeline
Evaluates Precision, Recall, mAP@50, and mAP@50-95 against held-out validation test split.
"""

import argparse
from pathlib import Path
from ultralytics import YOLO

def validate_moisture_model(
    weights_path: str = "backend/models/moisture_best.pt",
    data_yaml: str = "backend/training/data.yaml",
    imgsz: int = 640,
    device: str = "cpu",
):
    print("=" * 80)
    print("  PropCare NW — YOLO Moisture Validation & Benchmark Suite")
    print("=" * 80)

    weights = Path(weights_path)
    if not weights.is_file():
        print(f"Error: Trained model weights '{weights_path}' do not exist.")
        print("Please train a model first or copy weights to backend/models/moisture_best.pt.")
        return

    print(f"Loading weights from: {weights.resolve()}")
    model = YOLO(str(weights))

    # Run validation
    metrics = model.val(
        data=data_yaml,
        imgsz=imgsz,
        device=device,
        split="val",
        verbose=True,
    )

    print("\n" + "=" * 80)
    print("  Validation Results Summary")
    print("=" * 80)
    print(f"  Precision (B):   {metrics.box.mp:.4f}")
    print(f"  Recall (B):      {metrics.box.mr:.4f}")
    print(f"  mAP@50 (B):      {metrics.box.map50:.4f}")
    print(f"  mAP@50-95 (B):   {metrics.box.map:.4f}")
    print("=" * 80)

    # Per-class breakdown
    if hasattr(metrics.box, "maps") and metrics.box.maps is not None:
        print("\nPer-Class mAP@50-95 Breakdown:")
        for idx, map_val in enumerate(metrics.box.maps):
            class_name = model.names.get(idx, f"Class {idx}")
            print(f"  - {class_name:<28}: {map_val:.4f}")

    print("\nEvaluation artifacts and confusion matrix saved to 'runs/detect/val/'.")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Evaluate PropCare NW YOLO Moisture Model")
    parser.add_argument("--weights", default="backend/models/moisture_best.pt", help="Path to trained .pt file")
    parser.add_argument("--data", default="backend/training/data.yaml", help="Path to data.yaml")
    parser.add_argument("--imgsz", type=int, default=640, help="Evaluation image size")
    parser.add_argument("--device", default="cpu", help="Compute device ('cpu' or '0')")
    args = parser.parse_args()

    validate_moisture_model(
        weights_path=args.weights,
        data_yaml=args.data,
        imgsz=args.imgsz,
        device=args.device,
    )
