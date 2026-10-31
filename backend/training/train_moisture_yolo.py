"""
PropCare NW — Ultralytics YOLOv8 Moisture & Water Damage Training Pipeline
Fine-tunes a YOLOv8 architecture on building pathology and water ingress defect datasets.
"""

import os
import argparse
from pathlib import Path
from ultralytics import YOLO

def train_moisture_model(
    data_yaml: str = "backend/training/data.yaml",
    base_model: str = "yolov8m.pt",  # Medium or small for high precision on building textures
    epochs: int = 100,
    imgsz: int = 640,
    batch_size: int = 16,
    device: str = "0",  # CUDA device or 'cpu'
    output_dir: str = "runs/detect/moisture_train",
    export_to_app: bool = True,
):
    print("=" * 80)
    print("  PropCare NW — YOLO Moisture & Water Damage Model Training")
    print("=" * 80)
    print(f"Dataset Specification: {data_yaml}")
    print(f"Base Architecture:     {base_model}")
    print(f"Image Resolution:      {imgsz}x{imgsz}")
    print(f"Target Epochs:         {epochs}")
    print(f"Compute Device:        {device}")
    print("=" * 80)

    # Verify dataset YAML exists
    yaml_path = Path(data_yaml)
    if not yaml_path.is_file():
        raise FileNotFoundError(f"Dataset configuration '{data_yaml}' not found.")

    # Initialize model with pre-trained weights
    model = YOLO(base_model)

    # Train model with augmentations tailored for building surface defects
    results = model.train(
        data=str(yaml_path.resolve()),
        epochs=epochs,
        imgsz=imgsz,
        batch=batch_size,
        device=device,
        project=output_dir,
        name="moisture_yolov8",
        # Hyperparameters for building wall textures & varying lighting
        hsv_h=0.015,   # Minor hue shift (damp stains have subtle chromatic variations)
        hsv_s=0.5,     # Saturation adjustment (simulates dry vs active moisture saturation)
        hsv_v=0.4,     # Exposure variation (simulates dim crawlspaces vs bright flashlights)
        degrees=10.0,  # Slight rotation for non-orthogonal inspector angles
        translate=0.1, # Translation
        scale=0.3,     # Multi-scale inspection zooming
        mosaic=1.0,    # Mosaic augmentation for multi-defect context
        mixup=0.1,     # Slight mixup for diffuse water boundaries
        patience=20,   # Early stopping patience if mAP50 plateau
        save=True,
        save_period=10,
        val=True,
    )

    print("\nTraining completed successfully.")

    # Locate best weights using results.save_dir
    save_dir = Path(getattr(results, "save_dir", output_dir))
    best_weights_path = save_dir / "weights" / "best.pt"
    if not best_weights_path.is_file():
        # Fallback search
        candidate = Path(output_dir) / "moisture_yolov8" / "weights" / "best.pt"
        if candidate.is_file():
            best_weights_path = candidate

    if best_weights_path.is_file():
        print(f"Optimized model weights saved to: {best_weights_path}")

        if export_to_app:
            dest_path = Path("backend/models/moisture_best.pt")
            dest_path.parent.mkdir(parents=True, exist_ok=True)
            import shutil
            shutil.copy(best_weights_path, dest_path)
            print(f"Automatically deployed trained weights to application: {dest_path.resolve()}")
    else:
        print("Warning: Could not automatically locate 'best.pt' in runs directory.")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train PropCare NW YOLO Moisture Model")
    parser.add_argument("--data", default="backend/training/data.yaml", help="Path to data.yaml")
    parser.add_argument("--base", default="yolov8n.pt", help="Base model weights (yolov8n.pt, yolov8s.pt, yolov8m.pt)")
    parser.add_argument("--epochs", type=int, default=50, help="Number of training epochs")
    parser.add_argument("--imgsz", type=int, default=640, help="Input image dimension")
    parser.add_argument("--batch", type=int, default=8, help="Batch size")
    parser.add_argument("--device", default="cpu", help="Compute device ('cpu' or '0')")
    args = parser.parse_args()

    train_moisture_model(
        data_yaml=args.data,
        base_model=args.base,
        epochs=args.epochs,
        imgsz=args.imgsz,
        batch_size=args.batch,
        device=args.device,
    )
