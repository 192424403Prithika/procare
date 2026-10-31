import os
import shutil
import json
from pathlib import Path

def convert_coco_to_yolo():
    root = Path(".")
    dest = Path("backend/training/datasets/moisture_dataset")
    
    # Create directory tree
    for split in ["train", "val", "test"]:
        (dest / "images" / split).mkdir(parents=True, exist_ok=True)
        (dest / "labels" / split).mkdir(parents=True, exist_ok=True)

    sources = [
        {
            "name": "mold.v1i.coco",
            "dir": Path("mold.v1i.coco"),
            "class_id": 5, # visible_mould
        },
        {
            "name": "water damage.v1i.coco-segmentation",
            "dir": Path("water damage.v1i.coco-segmentation"),
            "class_id": 1, # damp_patch / water damage
        },
        {
            "name": "Building Defects.v1i.coco-segmentation",
            "dir": Path("Building Defects.v1i.coco-segmentation"),
            "class_id": 7, # plaster_deterioration / masonry crack
        },
    ]

    total_images = 0
    total_annotations = 0

    split_map = {
        "train": "train",
        "valid": "val",
        "test": "test"
    }

    for src in sources:
        src_dir = src["dir"]
        target_class_id = src["class_id"]
        
        if not src_dir.exists():
            print(f"Directory {src_dir} does not exist, skipping.")
            continue

        print(f"\nProcessing dataset: {src['name']} (Target Class {target_class_id})...")

        for src_split, dest_split in split_map.items():
            split_dir = src_dir / src_split
            if not split_dir.exists():
                continue

            ann_file = split_dir / "_annotations.coco.json"
            if not ann_file.exists():
                print(f"Annotation file not found: {ann_file}")
                continue

            with open(ann_file, "r", encoding="utf-8") as f:
                coco_data = json.load(f)

            images = {img["id"]: img for img in coco_data.get("images", [])}
            annotations = coco_data.get("annotations", [])

            # Group annotations by image_id
            img_to_anns = {}
            for ann in annotations:
                img_id = ann["image_id"]
                img_to_anns.setdefault(img_id, []).append(ann)

            split_img_count = 0
            split_ann_count = 0

            for img_id, img_info in images.items():
                orig_file_name = img_info["file_name"]
                orig_img_path = split_dir / orig_file_name
                if not orig_img_path.exists():
                    continue

                # Unique destination filename to prevent collision
                safe_prefix = src["name"].split(".")[0].replace(" ", "_")
                dest_file_name = f"{safe_prefix}_{orig_file_name}"
                dest_img_path = dest / "images" / dest_split / dest_file_name
                dest_lbl_path = dest / "labels" / dest_split / (Path(dest_file_name).stem + ".txt")

                # Copy image
                shutil.copy2(orig_img_path, dest_img_path)

                # Convert bounding boxes to YOLO format
                img_w = float(img_info["width"])
                img_h = float(img_info["height"])
                
                anns = img_to_anns.get(img_id, [])
                yolo_lines = []

                for ann in anns:
                    bbox = ann.get("bbox")
                    if not bbox or len(bbox) != 4:
                        continue

                    bx, by, bw, bh = bbox
                    if bw <= 0 or bh <= 0:
                        continue

                    # Convert COCO (x_min, y_min, w, h) to YOLO (x_center, y_center, w, h) normalized
                    x_center = min(1.0, max(0.0, (bx + bw / 2.0) / img_w))
                    y_center = min(1.0, max(0.0, (by + bh / 2.0) / img_h))
                    norm_w = min(1.0, max(0.0, bw / img_w))
                    norm_h = min(1.0, max(0.0, bh / img_h))

                    yolo_lines.append(f"{target_class_id} {x_center:.6f} {y_center:.6f} {norm_w:.6f} {norm_h:.6f}")
                    split_ann_count += 1

                # Write YOLO txt file
                with open(dest_lbl_path, "w", encoding="utf-8") as lf:
                    lf.write("\n".join(yolo_lines) + "\n")

                split_img_count += 1

            print(f"  {dest_split}: {split_img_count} images, {split_ann_count} annotations")
            total_images += split_img_count
            total_annotations += split_ann_count

    print(f"\nSuccessfully converted {total_images} images with {total_annotations} annotations into {dest}!")

if __name__ == "__main__":
    convert_coco_to_yolo()
