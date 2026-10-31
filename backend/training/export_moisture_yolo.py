"""
PropCare NW — Ultralytics YOLOv8 Moisture Model Export Utility
Exports trained PyTorch weights to ONNX, TorchScript, or TensorRT formats for high-throughput edge deployment.
"""

import argparse
from pathlib import Path
from ultralytics import YOLO

def export_moisture_model(
    weights_path: str = "backend/models/moisture_best.pt",
    export_format: str = "onnx",
    imgsz: int = 640,
    dynamic: bool = False,
):
    print("=" * 80)
    print("  PropCare NW — YOLO Model Exporter")
    print("=" * 80)

    weights = Path(weights_path)
    if not weights.is_file():
        print(f"Error: Model weights not found at '{weights_path}'.")
        return

    print(f"Loading weights: {weights.resolve()}")
    model = YOLO(str(weights))

    print(f"Exporting model to format: '{export_format}' (imgsz={imgsz})...")
    exported_path = model.export(
        format=export_format,
        imgsz=imgsz,
        dynamic=dynamic,
        simplify=True,
    )
    print(f"Successfully exported model to: {exported_path}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Export PropCare NW YOLO Moisture Model")
    parser.add_argument("--weights", default="backend/models/moisture_best.pt", help="Path to weights file")
    parser.add_argument("--format", default="onnx", choices=["onnx", "torchscript", "engine"], help="Export format")
    parser.add_argument("--imgsz", type=int, default=640, help="Input size")
    args = parser.parse_args()

    export_moisture_model(
        weights_path=args.weights,
        export_format=args.format,
        imgsz=args.imgsz,
    )
