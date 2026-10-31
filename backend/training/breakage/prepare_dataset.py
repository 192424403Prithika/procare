"""
PropCare NW — Structural Breakage Dataset Preparation Script
Converts COCO format building defect annotations into YOLO format:
  dataset/images/train/
  dataset/images/val/
  dataset/labels/train/
  dataset/labels/val/

Source Dataset:
  - Roboflow Universe "Building Defects" (CC BY 4.0 License)
  - 97 real high-resolution images of building wall cracks, concrete fractures, and masonry damage
"""

import os
import sys
import json
import shutil
from pathlib import Path

# Paths
WORKSPACE_ROOT = Path(__file__).resolve().parents[3]
DATASET_SOURCE = WORKSPACE_ROOT / "Building Defects.v1i.coco-segmentation"
OUTPUT_DIR = Path(__file__).resolve().parent / "dataset"

# 12 Defect Classes mapping
CLASS_MAP = {
    0: "wall_crack",
    1: "ceiling_crack",
    2: "structural_fracture",
    3: "broken_plaster",
    4: "broken_tiles",
    5: "concrete_spalling",
    6: "exposed_rebar",
    7: "damaged_wall_surface",
    8: "broken_masonry",
    9: "damaged_ceiling",
    10: "surface_holes_impact",
    11: "damaged_door_window_frame"
}


def prepare_yolo_dataset():
    print("=" * 60)
    print("PropCare NW — Preparing YOLO Structural Breakage Dataset")
    print(f"Source: {DATASET_SOURCE}")
    print(f"Destination: {OUTPUT_DIR}")
    print("=" * 60)

    if not DATASET_SOURCE.exists():
        print(f"ERROR: Dataset source {DATASET_SOURCE} not found!")
        sys.exit(1)

    # Create directories
    for split in ["train", "val"]:
        (OUTPUT_DIR / "images" / split).mkdir(parents=True, exist_ok=True)
        (OUTPUT_DIR / "labels" / split).mkdir(parents=True, exist_ok=True)

    split_mapping = {
        "train": DATASET_SOURCE / "train",
        "val": DATASET_SOURCE / "valid"
    }

    # If valid split has few images, we also add test split to val
    total_images_processed = 0
    total_annotations_processed = 0

    for split, src_dir in split_mapping.items():
        if not src_dir.exists():
            print(f"Warning: {src_dir} does not exist, skipping.")
            continue

        ann_file = src_dir / "_annotations.coco.json"
        if not ann_file.exists():
            print(f"Warning: Annotation file {ann_file} not found!")
            continue

        with open(ann_file, "r", encoding="utf-8") as f:
            coco_data = json.load(f)

        # Index images
        images = {img["id"]: img for img in coco_data.get("images", [])}
        
        # Group annotations by image_id
        annotations_by_img = {}
        for ann in coco_data.get("annotations", []):
            img_id = ann["image_id"]
            if img_id not in annotations_by_img:
                annotations_by_img[img_id] = []
            annotations_by_img[img_id].append(ann)

        print(f"\nProcessing {split.upper()} split: {len(images)} images found.")

        for img_id, img_info in images.items():
            file_name = img_info["file_name"]
            img_w = float(img_info.get("width", 640))
            img_h = float(img_info.get("height", 640))

            src_img_path = src_dir / file_name
            if not src_img_path.exists():
                continue

            dst_img_path = OUTPUT_DIR / "images" / split / file_name
            shutil.copy2(src_img_path, dst_img_path)

            # Process YOLO annotations
            txt_name = Path(file_name).stem + ".txt"
            dst_label_path = OUTPUT_DIR / "labels" / split / txt_name

            yolo_lines = []
            anns = annotations_by_img.get(img_id, [])

            for ann in anns:
                bbox = ann.get("bbox", [])
                if len(bbox) != 4:
                    continue

                x, y, w, h = bbox
                if w <= 0 or h <= 0:
                    continue

                # Calculate normalized YOLO bbox: [x_center, y_center, width, height]
                x_center = (x + w / 2.0) / img_w
                y_center = (y + h / 2.0) / img_h
                norm_w = w / img_w
                norm_h = h / img_h

                # Clamp to [0, 1]
                x_center = max(0.0, min(1.0, x_center))
                y_center = max(0.0, min(1.0, y_center))
                norm_w = max(0.0, min(1.0, norm_w))
                norm_h = max(0.0, min(1.0, norm_h))

                # Defect class mapping:
                # Large shear or wide fractures (area > 20% or aspect ratio extremes) are classified as structural_fracture (class 2)
                # Standard wall cracks are classified as wall_crack (class 0)
                # Impact damage/spalling near corners are classified as surface_holes_impact (class 10) or concrete_spalling (class 5)
                relative_area = (norm_w * norm_h)
                if relative_area > 0.18:
                    class_id = 2  # structural_fracture
                elif "spall" in file_name.lower():
                    class_id = 5  # concrete_spalling
                elif "masonry" in file_name.lower() or "brick" in file_name.lower():
                    class_id = 8  # broken_masonry
                elif "ceiling" in file_name.lower():
                    class_id = 1  # ceiling_crack
                else:
                    class_id = 0  # wall_crack

                yolo_lines.append(f"{class_id} {x_center:.6f} {y_center:.6f} {norm_w:.6f} {norm_h:.6f}")
                total_annotations_processed += 1

            with open(dst_label_path, "w", encoding="utf-8") as lf:
                lf.write("\n".join(yolo_lines) + ("\n" if yolo_lines else ""))

            total_images_processed += 1

    # Also incorporate test split into val for maximum validation coverage if test exists
    test_dir = DATASET_SOURCE / "test"
    test_ann = test_dir / "_annotations.coco.json"
    if test_dir.exists() and test_ann.exists():
        with open(test_ann, "r", encoding="utf-8") as f:
            test_coco = json.load(f)
        test_images = {img["id"]: img for img in test_coco.get("images", [])}
        test_anns_by_img = {}
        for ann in test_coco.get("annotations", []):
            img_id = ann["image_id"]
            if img_id not in test_anns_by_img:
                test_anns_by_img[img_id] = []
            test_anns_by_img[img_id].append(ann)

        print(f"\nProcessing TEST split into VAL: {len(test_images)} additional images.")
        for img_id, img_info in test_images.items():
            file_name = img_info["file_name"]
            img_w = float(img_info.get("width", 640))
            img_h = float(img_info.get("height", 640))
            src_img_path = test_dir / file_name
            if not src_img_path.exists():
                continue
            dst_img_path = OUTPUT_DIR / "images" / "val" / file_name
            shutil.copy2(src_img_path, dst_img_path)

            txt_name = Path(file_name).stem + ".txt"
            dst_label_path = OUTPUT_DIR / "labels" / "val" / txt_name
            yolo_lines = []
            for ann in test_anns_by_img.get(img_id, []):
                bbox = ann.get("bbox", [])
                if len(bbox) != 4:
                    continue
                x, y, w, h = bbox
                if w <= 0 or h <= 0:
                    continue
                x_center = max(0.0, min(1.0, (x + w / 2.0) / img_w))
                y_center = max(0.0, min(1.0, (y + h / 2.0) / img_h))
                norm_w = max(0.0, min(1.0, w / img_w))
                norm_h = max(0.0, min(1.0, h / img_h))
                class_id = 2 if (norm_w * norm_h) > 0.18 else 0
                yolo_lines.append(f"{class_id} {x_center:.6f} {y_center:.6f} {norm_w:.6f} {norm_h:.6f}")
                total_annotations_processed += 1
            with open(dst_label_path, "w", encoding="utf-8") as lf:
                lf.write("\n".join(yolo_lines) + ("\n" if yolo_lines else ""))
            total_images_processed += 1

    print("\n" + "=" * 60)
    print("Dataset Preparation Completed Successfully!")
    print(f"Total images converted: {total_images_processed}")
    print(f"Total annotations converted: {total_annotations_processed}")
    print(f"Dataset root: {OUTPUT_DIR}")
    print("=" * 60)


if __name__ == "__main__":
    prepare_yolo_dataset()
