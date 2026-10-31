"""
PropCare NW — Structural Breakage YOLOv8 Model Training Script
Trains an Ultralytics YOLOv8 object detection model on real building defect photographs.
Exports best weights to backend/models/breakage_best.pt and logs detailed evaluation metrics.
"""

import os
import sys
import shutil
import argparse
from pathlib import Path
from ultralytics import YOLO

# Project paths
BACKEND_DIR = Path(__file__).resolve().parents[2]
MODELS_DIR = BACKEND_DIR / "models"
DEFAULT_DATA_YAML = Path(__file__).resolve().parent / "data.yaml"
TARGET_WEIGHTS_PATH = MODELS_DIR / "breakage_best.pt"


def parse_args():
    parser = argparse.ArgumentParser(description="Train YOLO Structural Breakage Detection Model")
    parser.add_argument("--data", type=str, default=str(DEFAULT_DATA_YAML), help="Path to data.yaml")
    parser.add_argument("--base", type=str, default="yolov8n.pt", help="Pretrained base model (e.g. yolov8n.pt)")
    parser.add_argument("--epochs", type=int, default=15, help="Number of training epochs")
    parser.add_argument("--batch", type=int, default=16, help="Batch size")
    parser.add_argument("--imgsz", type=int, default=416, help="Image resolution for training")
    parser.add_argument("--device", type=str, default="cpu", help="Device (cpu or 0)")
    parser.add_argument("--output", type=str, default=str(TARGET_WEIGHTS_PATH), help="Destination for best.pt")
    return parser.parse_args()


def train():
    args = parse_args()

    print("=" * 65)
    print("PROPCARE NW — YOLO STRUCTURAL BREAKAGE MODEL TRAINING")
    print(f"Data configuration: {args.data}")
    print(f"Base architecture: {args.base}")
    print(f"Epochs: {args.epochs} | Batch size: {args.batch} | Image size: {args.imgsz}")
    print(f"Compute device: {args.device}")
    print(f"Output weights path: {args.output}")
    print("=" * 65)

    data_path = Path(args.data).resolve()
    if not data_path.exists():
        print(f"ERROR: Dataset configuration file not found at {data_path}")
        sys.exit(1)

    # Initialize Ultralytics YOLO model
    print(f"Initializing YOLO model with base: {args.base}...")
    model = YOLO(args.base)

    # Execute training
    print("Starting model training on structural defect dataset...")
    results = model.train(
        data=str(data_path),
        epochs=args.epochs,
        batch=args.batch,
        imgsz=args.imgsz,
        device=args.device,
        project="runs/breakage_train",
        name="exp",
        exist_ok=True,
        save=True,
        val=True,
        plots=True,
        verbose=True
    )

    # Locate best.pt
    best_weights = Path(results.save_dir) / "weights" / "best.pt"
    if not best_weights.exists():
        best_weights = Path(results.save_dir) / "weights" / "last.pt"

    if best_weights.exists():
        MODELS_DIR.mkdir(parents=True, exist_ok=True)
        dest_path = Path(args.output).resolve()
        shutil.copy2(best_weights, dest_path)
        print("\n" + "=" * 65)
        print("MODEL TRAINING COMPLETE & WEIGHTS DEPLOYED")
        print(f"Trained weights saved to: {dest_path}")
        print(f"Size: {dest_path.stat().st_size / (1024 * 1024):.2f} MB")
        print("=" * 65)
    else:
        print(f"Warning: Could not find output weights in {results.save_dir}")

    # Validate trained model
    print("\nRunning comprehensive model validation...")
    val_model = YOLO(str(best_weights) if best_weights.exists() else str(args.output))
    val_results = val_model.val(data=str(data_path), imgsz=args.imgsz, device=args.device)

    print("\n" + "=" * 65)
    print("EVALUATION & BENCHMARK METRICS:")
    print("=" * 65)
    
    # Extract metrics safely
    try:
        mp = float(val_results.box.mp)
        mr = float(val_results.box.mr)
        map50 = float(val_results.box.map50)
        map50_95 = float(val_results.box.map)
        print(f"Mean Precision (P):   {mp:.4f} ({mp*100:.1f}%)")
        print(f"Mean Recall (R):      {mr:.4f} ({mr*100:.1f}%)")
        print(f"mAP@50:               {map50:.4f} ({map50*100:.1f}%)")
        print(f"mAP@50-95:            {map50_95:.4f} ({map50_95*100:.1f}%)")
    except Exception as e:
        print(f"Validation summary: {val_results}")

    # Report confusion matrix and plots location
    print(f"\nArtifacts & Confusion Matrix stored in: {results.save_dir}")
    print("=" * 65)


if __name__ == "__main__":
    train()
