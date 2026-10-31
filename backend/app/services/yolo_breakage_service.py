import os
import cv2
import numpy as np
import logging
import datetime
from pathlib import Path
from typing import Optional, List, Dict, Tuple, Any
from bson import ObjectId

from app.core.config import settings
from app.schemas.yolo_breakage import (
    BreakageBoundingBox,
    BreakageDefectDetection,
    BreakageDetectResponse,
    BreakageModelStatusResponse,
)

logger = logging.getLogger("propcare.breakage_yolo")

# 12 Target Structural Breakage & Property Damage Classes
BREAKAGE_DEFECT_CLASSES = {
    0: {
        "key": "wall_crack",
        "label": "Wall Crack",
        "color": (45, 140, 240),      # BGR Amber
        "damage_type": "cosmetic",
        "base_severity": "moderate",
    },
    1: {
        "key": "ceiling_crack",
        "label": "Ceiling Crack",
        "color": (210, 85, 180),     # BGR Magenta
        "damage_type": "cosmetic",
        "base_severity": "moderate",
    },
    2: {
        "key": "structural_fracture",
        "label": "Structural Fracture",
        "color": (30, 30, 220),      # BGR Bright Red
        "damage_type": "structural",
        "base_severity": "critical",
    },
    3: {
        "key": "broken_plaster",
        "label": "Broken Plaster",
        "color": (120, 150, 160),    # BGR Slate
        "damage_type": "cosmetic",
        "base_severity": "moderate",
    },
    4: {
        "key": "broken_tiles",
        "label": "Chipped or Broken Tiles",
        "color": (200, 180, 50),     # BGR Cyan-Gold
        "damage_type": "cosmetic",
        "base_severity": "minor",
    },
    5: {
        "key": "concrete_spalling",
        "label": "Concrete Spalling",
        "color": (20, 90, 230),      # BGR Crimson-Orange
        "damage_type": "structural",
        "base_severity": "major",
    },
    6: {
        "key": "exposed_rebar",
        "label": "Exposed Reinforcement Steel",
        "color": (0, 0, 255),        # BGR Pure Red
        "damage_type": "structural",
        "base_severity": "critical",
    },
    7: {
        "key": "damaged_wall_surface",
        "label": "Damaged Wall Surface",
        "color": (130, 120, 110),    # BGR Gray
        "damage_type": "cosmetic",
        "base_severity": "moderate",
    },
    8: {
        "key": "broken_masonry",
        "label": "Broken Bricks or Masonry",
        "color": (40, 70, 200),      # BGR Dark Red-Orange
        "damage_type": "structural",
        "base_severity": "major",
    },
    9: {
        "key": "damaged_ceiling",
        "label": "Damaged Ceiling Section",
        "color": (170, 70, 190),     # BGR Violet
        "damage_type": "cosmetic",
        "base_severity": "moderate",
    },
    10: {
        "key": "surface_holes_impact",
        "label": "Surface Holes and Impact Damage",
        "color": (50, 180, 220),     # BGR Gold-Yellow
        "damage_type": "cosmetic",
        "base_severity": "moderate",
    },
    11: {
        "key": "damaged_door_window_frame",
        "label": "Damaged Door/Window Frame",
        "color": (160, 130, 80),     # BGR Blue-Green
        "damage_type": "cosmetic",
        "base_severity": "minor",
    },
}

class YoloBreakageDetector:
    """
    Singleton service managing Ultralytics YOLO structural breakage and property damage inference.
    """
    _instance: Optional["YoloBreakageDetector"] = None

    def __init__(self):
        self.model = None
        self.model_path = None
        self.is_loaded = False
        self.conf_threshold = getattr(settings, "BREAKAGE_YOLO_CONF_THRESHOLD", 0.25)
        self.iou_threshold = getattr(settings, "BREAKAGE_YOLO_IOU_THRESHOLD", 0.45)
        self.device = getattr(settings, "BREAKAGE_YOLO_DEVICE", "cpu")
        self._init_model()

    @classmethod
    def get_instance(cls) -> "YoloBreakageDetector":
        if cls._instance is None:
            cls._instance = YoloBreakageDetector()
        return cls._instance

    def _resolve_model_path(self) -> Optional[Path]:
        """Locates custom trained structural breakage weights file."""
        candidates = [
            Path(getattr(settings, "BREAKAGE_YOLO_MODEL_PATH", "backend/models/breakage_best.pt")),
            Path("models/breakage_best.pt"),
            Path("backend/models/breakage_best.pt"),
            Path("breakage_best.pt"),
            Path("backend/training/breakage/runs/weights/best.pt"),
        ]
        for c in candidates:
            if c.is_file():
                return c.resolve()
        return None

    def _init_model(self):
        """Loads Ultralytics YOLO model if custom trained breakage weights exist."""
        resolved = self._resolve_model_path()
        if not resolved:
            self.model = None
            self.model_path = None
            self.is_loaded = False
            logger.info("YOLO structural breakage weights not found. Status: unconfigured.")
            return

        try:
            from ultralytics import YOLO
            logger.info(f"Loading custom trained YOLO structural breakage model from: {resolved}")
            self.model = YOLO(str(resolved))
            self.model_path = str(resolved)
            self.is_loaded = True
            logger.info(f"Successfully initialized YOLO breakage model on device '{self.device}'.")
        except Exception as e:
            logger.error(f"Failed to load YOLO breakage model from {resolved}: {e}")
            self.model = None
            self.is_loaded = False

    def is_configured(self) -> bool:
        """Returns True only if real trained weights exist and model is loaded."""
        if not self.is_loaded or self.model is None:
            resolved = self._resolve_model_path()
            if resolved:
                self._init_model()
        return self.is_loaded and self.model is not None

    def get_status(self) -> BreakageModelStatusResponse:
        """Returns diagnostic status of YOLO structural breakage model."""
        configured = self.is_configured()
        path_str = self.model_path or getattr(settings, "BREAKAGE_YOLO_MODEL_PATH", "backend/models/breakage_best.pt")
        weights_exist = bool(self._resolve_model_path())

        classes_list = [f"{info['key']}: {info['label']}" for info in BREAKAGE_DEFECT_CLASSES.values()]
        instructions = (
            "Place custom trained YOLO breakage weights (.pt) at 'backend/models/breakage_best.pt' "
            "or set BREAKAGE_YOLO_MODEL_PATH in backend/.env to activate live optical inference. "
            "Train using backend/training/breakage/train.py on structural breakage datasets."
        )

        return BreakageModelStatusResponse(
            configured=configured,
            model_name="Ultralytics YOLO Structural Breakage Detector",
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
    ) -> BreakageDetectResponse:
        """
        Executes YOLO inference for structural breakage, generates OpenCV annotations,
        calculates area coverage, and classifies structural vs cosmetic damage severity.
        """
        now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
        result_id = str(ObjectId())

        # 1. Unconfigured State Handling (Never fabricate fake detections)
        if not self.is_configured():
            return BreakageDetectResponse(
                result_id=result_id,
                inspection_id=inspection_id,
                property_id=property_id,
                status="unconfigured",
                model_configured=False,
                model_name="Ultralytics YOLO Structural Breakage Detector",
                model_version="1.0.0",
                original_image_url=original_image_url,
                annotated_image_url=None,
                detections=[],
                total_defects=0,
                defect_counts={},
                structural_defect_count=0,
                cosmetic_defect_count=0,
                total_affected_area_percentage=0.0,
                severity_classification="minor",
                severity_score=0.0,
                severity_rationale=[
                    "Structural breakage AI model is not configured. Please add trained YOLO weights."
                ],
                recommendation="Install trained YOLO weights at backend/models/breakage_best.pt to activate AI breakage triage.",
                structural_engineer_required=False,
                timestamp=now_iso,
                inspector_id=inspector_id,
                message="Structural breakage AI model is not configured. Please add trained YOLO weights.",
            )

        # 2. Decode image into OpenCV BGR matrix
        nparr = np.frombuffer(image_bytes, np.uint8)
        img_bgr = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img_bgr is None:
            raise ValueError("Corrupted or invalid image binary payload.")

        h, w = img_bgr.shape[:2]
        total_pixels = float(h * w)
        annotated_bgr = img_bgr.copy()

        # 3. Execute YOLO Inference
        effective_conf = conf_threshold or self.conf_threshold
        results = self.model.predict(
            source=img_bgr,
            conf=effective_conf,
            iou=self.iou_threshold,
            device=self.device,
            verbose=False,
        )

        detections: List[BreakageDefectDetection] = []
        defect_counts: Dict[str, int] = {}
        total_defect_pixel_area = 0.0
        structural_count = 0
        cosmetic_count = 0

        if results and len(results) > 0:
            result = results[0]
            boxes = result.boxes

            if boxes is not None and len(boxes) > 0:
                for box in boxes:
                    xyxy = box.xyxy[0].tolist()  # [x1, y1, x2, y2]
                    conf = float(box.conf[0].item())
                    cls_id = int(box.cls[0].item())

                    cls_info = BREAKAGE_DEFECT_CLASSES.get(
                        cls_id,
                        {
                            "key": f"breakage_defect_{cls_id}",
                            "label": f"Building Defect ({cls_id})",
                            "color": (128, 128, 128),
                            "damage_type": "cosmetic",
                            "base_severity": "moderate",
                        },
                    )

                    x1, y1, x2, y2 = xyxy
                    bw = max(0.0, x2 - x1)
                    bh = max(0.0, y2 - y1)
                    box_area = bw * bh
                    total_defect_pixel_area += box_area
                    area_pct = round((box_area / total_pixels) * 100.0, 2)

                    damage_type = cls_info["damage_type"]
                    if damage_type == "structural":
                        structural_count += 1
                    else:
                        cosmetic_count += 1

                    d = BreakageDefectDetection(
                        class_id=cls_id,
                        class_name=cls_info["key"],
                        label=cls_info["label"],
                        confidence=round(conf, 4),
                        bbox=BreakageBoundingBox(
                            x1=round(x1, 1),
                            y1=round(y1, 1),
                            x2=round(x2, 1),
                            y2=round(y2, 1),
                            width=round(bw, 1),
                            height=round(bh, 1),
                        ),
                        area_percentage=area_pct,
                        damage_type=damage_type,
                        severity=cls_info["base_severity"],
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
                        cv2.LINE_AA,
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

        # 4. Save annotated image to storage
        annotated_url = self._save_annotated_image(annotated_bgr, inspection_id, result_id)

        # 5. Compute explainable severity classification & structural triage
        total_area_pct = round(min(100.0, (total_defect_pixel_area / total_pixels) * 100.0), 2)
        severity_class, severity_score, rationale, recommendation, engineer_needed = (
            self._evaluate_breakage_severity(detections, total_area_pct)
        )

        return BreakageDetectResponse(
            result_id=result_id,
            inspection_id=inspection_id,
            property_id=property_id,
            status="completed",
            model_configured=True,
            model_name="Ultralytics YOLO Structural Breakage Detector",
            model_version="1.0.0",
            original_image_url=original_image_url,
            annotated_image_url=annotated_url,
            detections=detections,
            total_defects=len(detections),
            defect_counts=defect_counts,
            structural_defect_count=structural_count,
            cosmetic_defect_count=cosmetic_count,
            total_affected_area_percentage=total_area_pct,
            severity_classification=severity_class,
            severity_score=severity_score,
            severity_rationale=rationale,
            recommendation=recommendation,
            structural_engineer_required=engineer_needed,
            timestamp=now_iso,
            inspector_id=inspector_id,
        )

    def _save_annotated_image(self, img_bgr, inspection_id: Optional[str], result_id: str) -> str:
        """Writes annotated output to disk and returns serving URL."""
        storage_dir = Path("uploads/storage/inspection-images")
        if inspection_id:
            storage_dir = storage_dir / str(inspection_id)
        storage_dir.mkdir(parents=True, exist_ok=True)

        filename = f"breakage_annotated_{result_id}.jpg"
        target_path = storage_dir / filename
        cv2.imwrite(str(target_path), img_bgr, [int(cv2.IMWRITE_JPEG_QUALITY), 92])

        if inspection_id:
            return f"/uploads/storage/inspection-images/{inspection_id}/{filename}"
        return f"/uploads/storage/inspection-images/{filename}"

    def classify_breakage_severity(
        self, detections: List[BreakageDefectDetection], total_area_pct: float
    ) -> dict:
        """Public helper for explainable severity evaluation returning structured dictionary."""
        severity_class, severity_score, rationale, recommendation, engineer_needed = (
            self._evaluate_breakage_severity(detections, total_area_pct)
        )
        return {
            "severity_classification": severity_class,
            "severity_score": severity_score,
            "severity_rationale": rationale,
            "recommendation": recommendation,
            "structural_engineer_required": engineer_needed,
        }

    def _evaluate_breakage_severity(
        self, detections: List[BreakageDefectDetection], total_area_pct: float
    ) -> Tuple[str, float, List[str], str, bool]:
        """
        Explainable rule-based severity triage distinguishing cosmetic from suspected structural damage.
        Returns: (severity_class, severity_score, rationale, recommendation, structural_engineer_required)
        """
        if not detections:
            return (
                "minor",
                5.0,
                ["No visible building damage or structural breakage detected above confidence threshold."],
                "Standard routine cyclical inspection schedule. No immediate remedial action required.",
                False,
            )

        rationale = []
        base_score = 10.0
        engineer_required = False

        has_rebar = any(d.class_name == "exposed_rebar" for d in detections)
        has_fracture = any(d.class_name == "structural_fracture" for d in detections)
        has_spalling = any(d.class_name == "concrete_spalling" for d in detections)
        has_masonry = any(d.class_name == "broken_masonry" for d in detections)
        has_wall_crack = any(d.class_name == "wall_crack" for d in detections)
        has_ceiling_crack = any(d.class_name == "ceiling_crack" for d in detections)
        has_plaster = any(d.class_name == "broken_plaster" for d in detections)

        # Area contribution
        base_score += min(30.0, total_area_pct * 2.5)

        # Critical Structural Triggers
        if has_rebar:
            base_score = max(base_score + 50.0, 90.0)
            engineer_required = True
            rationale.append(
                "CRITICAL: Exposed reinforcement steel (rebar) detected. Loss of concrete passivity and severe load-bearing compromise suspected."
            )
        if has_fracture:
            base_score = max(base_score + 45.0, 85.0)
            engineer_required = True
            rationale.append(
                "CRITICAL: Structural fracture detected penetrating substrate. High probability of differential settlement or load shear failure."
            )
        if has_spalling:
            base_score = max(base_score + 35.0, 75.0)
            engineer_required = True
            rationale.append(
                "MAJOR: Concrete spalling observed. Delamination of concrete cover poses falling debris hazard and progressive structural decay."
            )
        if has_masonry:
            base_score = max(base_score + 25.0, 65.0)
            rationale.append(
                "MAJOR: Broken bricks or fractured masonry courses detected. Wall stability requires physical structural assessment."
            )

        # Cosmetic Defect Contributions
        if has_wall_crack or has_ceiling_crack:
            crack_count = sum(1 for d in detections if "crack" in d.class_name)
            base_score += min(20.0, crack_count * 5.0)
            rationale.append(
                f"Visible cracking detected across {crack_count} section(s). Check if cracks exceed 2mm width or display shear stepping."
            )
        if has_plaster:
            base_score += 10.0
            rationale.append("Broken or detached plaster finishes require skimming and substrate re-adhesion.")

        final_score = round(min(100.0, base_score), 1)

        # Determine Category
        if has_rebar or has_fracture or final_score >= 80.0:
            classification = "critical"
            engineer_required = True
            recommendation = (
                "CRITICAL STRUCTURAL ACTION: Restrict immediate area access. Commission emergency Chartered Structural Engineer "
                "(MIStructE / MICE) site inspection within 24 hours. Temporary propping or shoring may be required."
            )
        elif has_spalling or has_masonry or final_score >= 55.0 or total_area_pct >= 15.0:
            classification = "major"
            engineer_required = True
            recommendation = (
                "MAJOR DEFECT: Arrange formal structural survey within 7 business days. Inspect foundation movement, load paths, "
                "and concrete carbonation depth before commencing surface repairs."
            )
        elif final_score >= 25.0:
            classification = "moderate"
            recommendation = (
                "MODERATE DEFECT: Visible building damage requiring standard maintenance contractor works. "
                "Rake out cracks, patch deteriorated plaster, and monitor for further seasonal movement."
            )
        else:
            classification = "minor"
            recommendation = (
                "MINOR COSMETIC DAMAGE: Superficial hairline cracks or chipped surface finishes. "
                "Include in scheduled cyclical painting and maintenance works."
            )

        return classification, final_score, rationale, recommendation, engineer_required

# Global singleton getter
def get_breakage_detector() -> YoloBreakageDetector:
    return YoloBreakageDetector.get_instance()
