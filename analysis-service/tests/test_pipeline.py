import sys
import os
import unittest
import numpy as np
import cv2

# Add parent directory to path so imports work cleanly
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.services.image_processing import (
    process_moisture_analysis,
    normalize_exposure,
    align_images_feature_matching,
    estimate_blur_score,
    decode_image_input,
)

class TestMoistureImageProcessingPipeline(unittest.TestCase):
    def setUp(self):
        # Base realistic dry plaster surface with subtle wall texture
        self.width = 640
        self.height = 480
        np.random.seed(42)

        # Create base dry plasterboard texture
        self.dry_wall = np.ones((self.height, self.width, 3), dtype=np.uint8) * 160
        # Add texture noise
        noise = np.random.normal(0, 5, self.dry_wall.shape).astype(np.int16)
        self.dry_wall = np.clip(self.dry_wall.astype(np.int16) + noise, 0, 255).astype(np.uint8)
        # Add visual reference features (grout line / wall boundary)
        cv2.line(self.dry_wall, (50, 400), (590, 400), (120, 120, 120), 3)
        cv2.line(self.dry_wall, (200, 50), (200, 400), (130, 130, 130), 2)
        cv2.circle(self.dry_wall, (320, 240), 15, (100, 100, 100), -1)

    def test_case_1_dry_surface(self):
        """
        Test Case 1: Two images of the exact same dry surface.
        Expected: Difference ~0%, anomaly_count == 0, confidence high.
        """
        ambient = self.dry_wall.copy()
        flash = self.dry_wall.copy()

        # Flash adds uniform slight brightness gain
        flash = np.clip(flash.astype(np.float32) * 1.15, 0, 255).astype(np.uint8)

        # Encode to bytes for testing
        _, amb_bytes = cv2.imencode(".png", ambient)
        _, fls_bytes = cv2.imencode(".png", flash)

        result = process_moisture_analysis(
            ambient_input=amb_bytes.tobytes(),
            flash_input=fls_bytes.tobytes(),
            sensitivity=0.5,
        )

        self.assertEqual(result.status, "completed")
        self.assertLess(result.difference_percentage, 1.5, "Dry surface should have <1.5% anomaly variance")
        self.assertEqual(result.anomaly_count, 0, "Dry surface should have 0 detected anomalies")
        self.assertIn("dry substrate", result.result_summary.lower())

    def test_case_2_different_lighting_exposure_normalization(self):
        """
        Test Case 2: Images with significant global lighting difference.
        Expected: Normalization aligns baseline luminance without triggering global false positives.
        """
        # Dim ambient exposure (underexposed room)
        ambient_dim = np.clip(self.dry_wall.astype(np.float32) * 0.45, 0, 255).astype(np.uint8)
        # Strong direct flash
        flash_bright = np.clip(self.dry_wall.astype(np.float32) * 1.4, 0, 255).astype(np.uint8)

        _, amb_bytes = cv2.imencode(".png", ambient_dim)
        _, fls_bytes = cv2.imencode(".png", flash_bright)

        result = process_moisture_analysis(
            ambient_input=amb_bytes.tobytes(),
            flash_input=fls_bytes.tobytes(),
            sensitivity=0.4,
        )

        self.assertEqual(result.status, "completed")
        self.assertLess(result.difference_percentage, 3.0, "Exposure normalization should prevent false positive flood")

    def test_case_3_different_camera_angles_alignment(self):
        """
        Test Case 3: Images with slight translation and perspective angle shift.
        Expected: SIFT/ORB feature matching successfully aligns coordinate frames.
        """
        ambient = self.dry_wall.copy()

        # Apply affine transformation (shift 15px right, 10px down, slight rotation)
        M = cv2.getRotationMatrix2D((self.width / 2, self.height / 2), 2.0, 1.0)
        M[0, 2] += 12.0
        M[1, 2] += 8.0
        flash_shifted = cv2.warpAffine(self.dry_wall, M, (self.width, self.height))

        _, amb_bytes = cv2.imencode(".png", ambient)
        _, fls_bytes = cv2.imencode(".png", flash_shifted)

        result = process_moisture_analysis(
            ambient_input=amb_bytes.tobytes(),
            flash_input=fls_bytes.tobytes(),
        )

        self.assertEqual(result.status, "completed")
        self.assertGreater(result.alignment_quality, 50.0, "Alignment quality should exceed 50% on textured surface")

    def test_case_4_visible_damp_patch_detection(self):
        """
        Test Case 4: Surface containing a prominent damp patch (specular sheen under flash, absorption in ambient).
        Expected: Successfully detects anomaly region, marks severity, produces non-zero area.
        """
        ambient = self.dry_wall.copy()
        flash = self.dry_wall.copy()

        # In ambient: damp plaster appears darker due to optical absorption
        cv2.ellipse(ambient, (320, 240), (80, 50), 20, 0, 360, (70, 70, 70), -1)

        # In flash: wet surface acts as specular mirror, reflecting flash directly back into lens
        cv2.ellipse(flash, (320, 240), (80, 50), 20, 0, 360, (250, 245, 230), -1)
        cv2.circle(flash, (310, 230), 25, (255, 255, 255), -1)

        _, amb_bytes = cv2.imencode(".png", ambient)
        _, fls_bytes = cv2.imencode(".png", flash)

        result = process_moisture_analysis(
            ambient_input=amb_bytes.tobytes(),
            flash_input=fls_bytes.tobytes(),
            sensitivity=0.6,
        )

        self.assertEqual(result.status, "completed")
        self.assertGreater(result.anomaly_count, 0, "Damp patch must be detected as an anomalous region")
        self.assertGreater(result.difference_percentage, 1.0, "Difference percentage should reflect damp patch size")
        self.assertTrue(any(r.severity in ("critical", "high") for r in result.regions))
        self.assertTrue(result.heatmap_base64.startswith("data:image/jpeg;base64,"))

    def test_case_5_invalid_or_blurry_image(self):
        """
        Test Case 5: Heavily blurred image.
        Expected: Pipeline handles gracefully and penalizes confidence score.
        """
        ambient = cv2.GaussianBlur(self.dry_wall, (31, 31), 0)  # Extreme blur
        flash = cv2.GaussianBlur(self.dry_wall, (31, 31), 0)

        _, amb_bytes = cv2.imencode(".png", ambient)
        _, fls_bytes = cv2.imencode(".png", flash)

        result = process_moisture_analysis(
            ambient_input=amb_bytes.tobytes(),
            flash_input=fls_bytes.tobytes(),
        )

        self.assertEqual(result.status, "completed")
        self.assertLessEqual(result.confidence_score, 85.0, "Heavy blur must reduce confidence score")

    def test_case_6_empty_payload_error_handling(self):
        """
        Test Case 6: Empty input.
        Expected: Raises ValueError with clean message.
        """
        with self.assertRaises(ValueError):
            process_moisture_analysis(b"", b"")

if __name__ == "__main__":
    unittest.main()
