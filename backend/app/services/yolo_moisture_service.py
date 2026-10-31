import os
import io
import cv2
import time
import math
import base64
import logging
import datetime
from pathlib import Path
from typing import List, Dict, Tuple, Optional, Any
from bson import ObjectId

from app.core.config import settings
from app.schemas.yolo_moisture import (
    BoundingBox,
    DefectDetection,
    MoistureDetectResponse,
    ModelStatusResponse,
)

logger = logging.getLogger("propcare.yolo_moisture")

# 8 Water Damage & Moisture Defect Classes
MOISTURE_DEFECT_CLASSES = {
    0: {"key": "water_stain", "label": "Water Stain", "color": (230, 160, 40), "severity": "low"},
    1: {"key": "damp_patch", "label": "Damp Patch", "color": (210, 95, 30), "severity": "high"},
    2: {"key": "wall_moisture_damage", "label": "Wall Moisture Damage", "color": (180, 50, 30), "severity": "high"},
    3: {"key": "ceiling_water_damage", "label": "Ceiling Water Damage", "color": (140, 20, 20), "severity": "critical"},
    4: {"key": "peeling_paint", "label": "Peeling or Bubbling Paint", "color": (40, 175, 230), "severity": "medium"},
    5: {"key": "visible_mould", "label": "Visible Mould-Like Growth", "color": (30, 30, 210), "severity": "critical"},
    6: {"key": "leakage_mark", "label": "Water Leakage Mark", "color": (120, 50, 210), "severity": "high"},
    7: {"key": "plaster_deterioration", "label": "Plaster Deterioration", "color": (80, 130, 180), "severity": "medium"},
}

CLASS_KEY_TO_ID = {info["key"]: cid for cid, info in MOISTURE_DEFECT_CLASSES.items()}

class YoloMoistureDetector:
    _instance: Optional["YoloMoistureDetector"] = None

    def __init__(self):
        self.model = None
        self.model_path = None
        self.is_loaded = False
        self.device = getattr(settings, "YOLO_DEVICE", "cpu")
        self._init_model()

    @classmethod
    def get_instance(cls) -> "YoloMoistureDetector":
        if cls._instance is None:
            cls._instance = YoloMoistureDetector()
        return cls._instance

    def _resolve_model_path(self) -> Optional[Path]:
        """Locates custom trained weights file."""
        candidates = [
            Path(getattr(settings, "YOLO_MODEL_PATH", "backend/models/moisture_best.pt")),
            Path("models/moisture_best.pt"),
            Path("backend/models/moisture_best.pt"),
            Path("moisture_best.pt"),
        ]
        for c in candidates:
            if c.is_file():
                return c.resolve()
        return None

    def _init_model(self):
        """Loads Ultralytics YOLO model if custom weights exist."""
        resolved = self._resolve_model_path()
        if not resolved:
            self.model = None
            self.model_path = None
            self.is_loaded = False
            logger.info("YOLO moisture model weights not found. Model status: unconfigured.")
            return

        try:
            from ultralytics import YOLO
            logger.info(f"Loading custom trained YOLO moisture model from: {resolved}")
            self.model = YOLO(str(resolved))
            self.model_path = str(resolved)
            self.is_loaded = True
            logger.info(f"Successfully initialized YOLO moisture model on device '{self.device}'.")
        except Exception as e:
            logger.error(f"Failed to load YOLO model from {resolved}: {e}")
            self.model = None
            self.is_loaded = False

    def is_configured(self) -> bool:
        """Returns True only if real trained weights exist and model is loaded."""
        if not self.is_loaded or self.model is None:
            # Check if weights appeared since last check
            resolved = self._resolve_model_path()
            if resolved:
                self._init_model()
        return self.is_loaded and self.model is not None

    def get_status(self) -> ModelStatusResponse:
        """Returns diagnostic status of YOLO model architecture and weights configuration."""
        configured = self.is_configured()
        path_str = self.model_path or getattr(settings, "YOLO_MODEL_PATH", "backend/models/moisture_best.pt")
        weights_exist = bool(self._resolve_model_path())

        classes_list = [f"{info['key']}: {info['label']}" for info in MOISTURE_DEFECT_CLASSES.values()]
        instructions = (
            "Place custom trained YOLO weights (.pt) at 'backend/models/moisture_best.pt' "
            "or set YOLO_MODEL_PATH in backend/.env to activate live optical inference. "
            "Train using backend/training/train_moisture_yolo.py on building water damage datasets."
        )

        return ModelStatusResponse(
            configured=configured,
            model_name="Ultralytics YOLO Moisture & Water Damage Detector",
            weights_path=path_str,
            weights_exist=weights_exist,
            classes=classes_list,
            device=self.device,
            instructions=instructions,
        )

    def run_detection(
        self,
        image_bytes: bytes,
        original_image_url: str,
        inspection_id: Optional[str] = None,
        property_id: Optional[str] = None,
        inspector_id: Optional[str] = None,
        conf_threshold: Optional[float] = None,
    ) -> MoistureDetectResponse:
        """
        Executes YOLO inference, generates OpenCV annotations, calculates area estimates,
        and constructs explainable moisture risk classification.
        """
        now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
        result_id = str(ObjectId())

        # 1. Check if model is configured
        if not self.is_configured():
            return MoistureDetectResponse(
                result_id=result_id,
                inspection_id=inspection_id,
                property_id=property_id,
                status="unconfigured",
                model_configured=False,
                model_name="Ultralytics YOLO Moisture Detector",
                model_version="1.0.0",
                original_image_url=original_image_url,
                annotated_image_url=None,
                detections=[],
                total_defects=0,
                defect_counts={},
                total_affected_area_percentage=0.0,
                risk_classification="low",
                risk_score=0.0,
                risk_rationale=[
                    "Moisture detection model is not configured. Add trained YOLO weights to enable AI detection."
                ],
                recommendation="Install trained YOLO weights at backend/models/moisture_best.pt to activate AI defect triage.",
                message="Moisture detection model is not configured. Add trained YOLO weights to enable AI detection.",
                timestamp=now_iso,
                inspector_id=inspector_id,
            )

        # 2. Decode image with OpenCV
        nparr = bytearray(image_bytes)
        import numpy as np
        img_np = np.asarray(nparr, dtype=np.uint8)
        img_bgr = cv2.imdecode(img_np, cv2.IMREAD_COLOR)

        if img_bgr is None:
            raise ValueError("Corrupted image file or unsupported image format for OpenCV decoding.")

        h, w = img_bgr.shape[:2]
        total_pixels = float(h * w)

        # 3. Run real YOLO inference
        conf_thresh = conf_threshold or getattr(settings, "YOLO_CONF_THRESHOLD", 0.25)
        iou_thresh = getattr(settings, "YOLO_IOU_THRESHOLD", 0.45)

        try:
            results = self.model.predict(
                source=img_bgr,
                conf=conf_thresh,
                iou=iou_thresh,
                device=self.device,
                verbose=False,
            )
        except Exception as inf_err:
            logger.error(f"Inference execution failed: {inf_err}")
            raise RuntimeError(f"YOLO inference failed: {inf_err}")

        # 4. Extract detections and annotate image
        annotated_bgr = img_bgr.copy()
        detections: List[DefectDetection] = []
        defect_counts: Dict[str, int] = {}
        total_defect_pixel_area = 0.0

        if results and len(results) > 0:
            result = results[0]
            boxes = result.boxes

            if boxes is not None and len(boxes) > 0:
                for box in boxes:
                    xyxy = box.xyxy[0].tolist()  # [x1, y1, x2, y2]
                    conf = float(box.conf[0].item())
                    cls_id = int(box.cls[0].item())

                    # Map class ID to moisture defect specifications
                    cls_info = MOISTURE_DEFECT_CLASSES.get(
                        cls_id,
                        {
                            "key": f"defect_{cls_id}",
                            "label": f"Water Defect (Class {cls_id})",
                            "color": (128, 128, 128),
                            "severity": "medium",
                        },
                    )

                    x1, y1, x2, y2 = xyxy
                    bw = max(0.0, x2 - x1)
                    bh = max(0.0, y2 - y1)
                    box_area = bw * bh
                    total_defect_pixel_area += box_area
                    area_pct = round((box_area / total_pixels) * 100.0, 2)

                    d = DefectDetection(
                        class_id=cls_id,
                        class_name=cls_info["key"],
                        label=cls_info["label"],
                        confidence=round(conf, 4),
                        bbox=BoundingBox(
                            x1=round(x1, 1),
                            y1=round(y1, 1),
                            x2=round(x2, 1),
                            y2=round(y2, 1),
                            width=round(bw, 1),
                            height=round(bh, 1),
                        ),
                        area_percentage=area_pct,
                        severity=cls_info["severity"],
                    )
                    detections.append(d)
                    defect_counts[cls_info["label"]] = defect_counts.get(cls_info["label"], 0) + 1

                    # OpenCV Annotation: Bounding Box
                    color = cls_info["color"]
                    ix1, iy1, ix2, iy2 = int(x1), int(y1), int(x2), int(y2)
                    cv2.rectangle(annotated_bgr, (ix1, iy1), (ix2, iy2), color, 2, cv2.LINE_AA)

                    # Pill label background
                    label_text = f"{cls_info['label']} {int(conf * 100)}%"
                    (tw, th), baseline = cv2.getTextSize(label_text, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 1)
                    pill_y1 = max(0, iy1 - th - 8)
                    pill_y2 = iy1
                    pill_x2 = min(w, ix1 + tw + 8)

                    cv2.rectangle(
                        annotated_bgr,
                        (ix1, pill_y1),
                        (pill_x2, pill_y2),
                        color,
                        -1,
                    )
                    cv2.putText(
                        annotated_bgr,
                        label_text,
                        (ix1 + 4, iy1 - 4),
                        cv2.FONT_HERSHEY_SIMPLEX,
                        0.5,
                        (255, 255, 255),
                        1,
                        cv2.LINE_AA,
                    )

        # 5. Add Brand Watermark
        watermark_text = f"PropCare NW • YOLO Moisture AI • Total Detections: {len(detections)}"
        cv2.putText(
            annotated_bgr,
            watermark_text,
            (16, h - 16),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.5,
            (0, 0, 0),
            2,
            cv2.LINE_AA,
        )
        cv2.putText(
            annotated_bgr,
            watermark_text,
            (16, h - 16),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.5,
            (255, 255, 255),
            1,
            cv2.LINE_AA,
        )

        # 6. Save annotated image to storage disk
        annotated_url = self._save_annotated_image(annotated_bgr, inspection_id, result_id)

        # 7. Compute explainable moisture risk classification
        total_area_pct = round(min(100.0, (total_defect_pixel_area / total_pixels) * 100.0), 2)
        risk_class, risk_score, rationale, recommendation = self._evaluate_moisture_risk(
            detections, total_area_pct
        )

        return MoistureDetectResponse(
            result_id=result_id,
            inspection_id=inspection_id,
            property_id=property_id,
            status="completed",
            model_configured=True,
            model_name="Ultralytics YOLO Moisture & Water Damage Detector",
            model_version="1.0.0",
            original_image_url=original_image_url,
            annotated_image_url=annotated_url,
            detections=detections,
            total_defects=len(detections),
            defect_counts=defect_counts,
            total_affected_area_percentage=total_area_pct,
            risk_classification=risk_class,
            risk_score=risk_score,
            risk_rationale=rationale,
            recommendation=recommendation,
            timestamp=now_iso,
            inspector_id=inspector_id,
        )

    def _save_annotated_image(self, img_bgr, inspection_id: Optional[str], result_id: str) -> str:
        """Writes annotated output to disk and returns public/proxy URL."""
        storage_dir = Path("uploads/storage/inspection-images")
        if inspection_id:
            storage_dir = storage_dir / str(inspection_id)
        storage_dir.mkdir(parents=True, exist_ok=True)

        filename = f"yolo_annotated_{result_id}.jpg"
        target_path = storage_dir / filename
        cv2.imwrite(str(target_path), img_bgr, [int(cv2.IMWRITE_JPEG_QUALITY), 92])

        # Return relative URL serving path
        if inspection_id:
            return f"/uploads/storage/inspection-images/{inspection_id}/{filename}"
        return f"/uploads/storage/inspection-images/{filename}"

    def _evaluate_moisture_risk(
        self, detections: List[DefectDetection], total_area_pct: float
    ) -> Tuple[str, float, List[str], str]:
        """
        Computes explainable risk level based on detected defects, area coverage, and statutory thresholds.
        """
        if not detections:
            return (
                "low",
                10.0,
                ["No visual moisture or water damage patterns detected above the confidence threshold."],
                "Standard cyclical maintenance schedule. No immediate remediation indicated.",
            )

        rationale = []
        base_score = 15.0

        has_mould = any(d.class_name == "visible_mould" for d in detections)
        has_ceiling = any(d.class_name == "ceiling_water_damage" for d in detections)
        has_leakage = any(d.class_name == "leakage_mark" for d in detections)
        has_wall_damage = any(d.class_name == "wall_moisture_damage" for d in detections)
        has_damp_patch = any(d.class_name == "damp_patch" for d in detections)

        max_conf = max(d.confidence for d in detections)

        # Area contribution
        base_score += min(40.0, total_area_pct * 3.0)

        # Defect severity contributions
        if has_mould:
            mould_count = sum(1 for d in detections if d.class_name == "visible_mould")
            base_score = max(base_score + 40.0, 85.0)
            rationale.append(
                f"Visible mould-like growth detected ({mould_count} region(s)). "
                f"Statutory Awaab's Law Section 10A mandatory triage protocol applies."
            )
        if has_ceiling:
            base_score += 25.0
            rationale.append("Ceiling water damage indicates active overhead leakage or roof/service penetration.")
        if has_leakage:
            base_score += 20.0
            rationale.append("Water leakage marks demonstrate active or recurring liquid water egress.")
        if has_wall_damage or has_damp_patch:
            base_score += 15.0
            rationale.append(f"Substantial damp or wall moisture damage detected across {total_area_pct}% of field of view.")

        final_score = round(min(100.0, base_score), 1)

        # Determine Category
        if has_mould or (has_ceiling and has_leakage) or final_score >= 80.0:
            classification = "critical"
            recommendation = (
                "CRITICAL STATUTORY ACTION: Mobilize approved damp/mould remediation contractor within 24 hours "
                "under Awaab's Law Section 10A. Conduct calibrated pin-type moisture meter audit to verify substrate damp levels."
            )
        elif has_wall_damage or has_damp_patch or final_score >= 55.0:
            classification = "high"
            recommendation = (
                "HIGH PRIORITY: Dispatch building surveyor to measure moisture levels with calibrated protimeter. "
                "Inspect plumbing, damp-proof course, and exterior flashing within 7 business days."
            )
        elif final_score >= 30.0:
            classification = "moderate"
            recommendation = (
                "MODERATE CONCERN: Inspect localized surface deterioration, scrape peeling paint, apply anti-condensation "
                "barrier, and re-inspect at next scheduled quarterly cycle."
            )
        else:
            classification = "low"
            recommendation = (
                "LOW CONCERN: Minor early water staining observed. Keep under routine maintenance observation."
            )

        return classification, final_score, rationale, recommendation

# Global singleton getter
def get_yolo_detector() -> YoloMoistureDetector:
    return YoloMoistureDetector.get_instance()
