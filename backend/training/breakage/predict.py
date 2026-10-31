"""
PropCare NW — Structural Breakage YOLOv8 Prediction & Inference CLI
Runs actual computer vision inference on input building damage photograph.
Generates OpenCV annotated image with defect bounding boxes, confidence tags, and severity assessment.
"""

import sys
import argparse
from pathlib import Path
import cv2
from ultralytics import YOLO

BACKEND_DIR = Path(__file__).resolve().parents[2]
DEFAULT_WEIGHTS = BACKEND_DIR / "models" / "breakage_best.pt"


def parse_args():
    parser = argparse.ArgumentParser(description="Run YOLO Breakage Detection on an Image")
    parser.add_argument("--image", type=str, required=True, help="Path to input building photograph")
    parser.add_argument("--weights", type=str, default=str(DEFAULT_WEIGHTS), help="Path to weights .pt")
    parser.add_argument("--conf", type=float, default=0.25, help="Confidence threshold")
    parser.add_argument("--output", type=str, default="annotated_breakage_test.jpg", help="Output path for annotated image")
    return parser.parse_args()


def predict():
    args = parse_args()
    img_path = Path(args.image).resolve()
    weights_path = Path(args.weights).resolve()

    if not img_path.exists():
        print(f"ERROR: Input image {img_path} not found!")
        sys.exit(1)
    if not weights_path.exists():
        print(f"ERROR: Weights file {weights_path} not found!")
        sys.exit(1)

    print("=" * 65)
    print("PROPCARE NW — STRUCTURAL BREAKAGE INFERENCE")
    print(f"Image: {img_path}")
    print(f"Weights: {weights_path}")
    print(f"Confidence threshold: {args.conf}")
    print("=" * 65)

    model = YOLO(str(weights_path))
    results = model.predict(source=str(img_path), conf=args.conf, save=False)

    img = cv2.imread(str(img_path))
    h, w = img.shape[:2]
    img_area = float(h * w)

    detections = []
    has_structural = False

    for result in results:
        boxes = result.boxes
        for box in boxes:
            xyxy = box.xyxy[0].cpu().numpy().tolist()
            conf = float(box.conf[0].cpu().numpy())
            cls_id = int(box.cls[0].cpu().numpy())
            cls_name = model.names.get(cls_id, f"defect_{cls_id}")

            bx1, by1, bx2, by2 = [int(v) for v in xyxy]
            bw = max(1, bx2 - bx1)
            bh = max(1, by2 - by1)
            area_pct = round((bw * bh / img_area) * 100.0, 2)

            is_struct = cls_name in ["structural_fracture", "exposed_rebar", "concrete_spalling", "broken_masonry"]
            if is_struct:
                has_structural = True

            color = (0, 0, 220) if is_struct else (0, 165, 255)
            cv2.rectangle(img, (bx1, by1), (bx2, by2), color, 2)

            label = f"{cls_name} {conf*100:.1f}% ({area_pct}%)"
            cv2.putText(img, label, (bx1, max(15, by1 - 8)), cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)

            detections.append({
                "class_name": cls_name,
                "confidence": round(conf, 4),
                "area_percent": area_pct,
                "structural_suspected": is_struct,
                "box": [bx1, by1, bx2, by2]
            })

    output_path = Path(args.output).resolve()
    cv2.imwrite(str(output_path), img)

    print(f"\nDetections found: {len(detections)}")
    for i, d in enumerate(detections, 1):
        print(f"  [{i}] {d['class_name'].upper()} — Confidence: {d['confidence']*100:.1f}%, Area: {d['area_percent']}% (Structural: {d['structural_suspected']})")

    severity = "Critical" if (has_structural or len(detections) >= 3) else ("Moderate" if len(detections) > 0 else "None")
    print(f"\nOverall Severity: {severity.upper()}")
    print(f"Annotated output saved to: {output_path}")

    print("\n" + "*" * 65)
    print("MANDATORY SAFETY DISCLAIMER:")
    print("AI image analysis identifies visible damage indicators. It does not establish")
    print("structural integrity or determine whether a building is safe. Major or critical")
    print("findings require assessment by a qualified structural engineer.")
    print("*" * 65)


if __name__ == "__main__":
    predict()
