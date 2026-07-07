import base64
import contextlib
import io
import os
import sys
import cv2
import tempfile
import numpy as np
from io import BytesIO
from PIL import Image
from typing import Tuple

# Force UTF-8 console output on Windows to prevent charmap errors
if sys.stdout and hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass
if sys.stderr and hasattr(sys.stderr, 'reconfigure'):
    try:
        sys.stderr.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass

# DeepFace is now the default. Disable by setting USE_DEEPFACE=0 in .env.
# The histogram+LBP+SSIM fallback is used if DeepFace is unavailable.
_USE_DEEPFACE = os.environ.get("USE_DEEPFACE", "1") == "1"
DEEPFACE_AVAILABLE = False

if _USE_DEEPFACE:
    try:
        _buf = io.StringIO()
        with contextlib.redirect_stdout(_buf), contextlib.redirect_stderr(_buf):
            from deepface import DeepFace
        DEEPFACE_AVAILABLE = True
        print("[FaceVerify] DeepFace loaded successfully (neural mode).")
    except Exception as e:
        print(f"[FaceVerify] DeepFace unavailable, using histogram fallback. ({e})")
else:
    print("[FaceVerify] DeepFace disabled via USE_DEEPFACE=0, using histogram fallback.")

FACES_DIR = "registered_faces"
os.makedirs(FACES_DIR, exist_ok=True)


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def _strip_data_url(b64: str) -> str:
    """Strip 'data:image/...;base64,' prefix if present."""
    if "," in b64:
        return b64.split(",", 1)[1]
    return b64.strip()


def base64_to_cv2(base64_str: str) -> np.ndarray:
    """Decode a base64 image string into an OpenCV BGR array."""
    clean = _strip_data_url(base64_str)
    image_bytes = base64.b64decode(clean)
    image_pil = Image.open(BytesIO(image_bytes)).convert("RGB")
    return cv2.cvtColor(np.array(image_pil), cv2.COLOR_RGB2BGR)


def save_registered_face(student_id: int, image_base64: str) -> str:
    """Save the student's registered face snapshot to disk."""
    img = base64_to_cv2(image_base64)
    path = os.path.join(FACES_DIR, f"student_{student_id}.jpg")
    cv2.imwrite(path, img, [cv2.IMWRITE_JPEG_QUALITY, 95])
    print(f"[FaceVerify] Face registered for student {student_id}")
    return path


# ─────────────────────────────────────────────────────────────────────────────
# Fallback: Histogram + LBP fusion
# ─────────────────────────────────────────────────────────────────────────────

def _histogram_similarity(img1: np.ndarray, img2: np.ndarray) -> float:
    """
    YCrCb multi-channel histogram correlation.
    Returns ~[-1, 1]: higher = more similar.
    Robust to JPEG re-encoding and moderate lighting changes.
    """
    TARGET = (128, 96)
    y1 = cv2.cvtColor(cv2.resize(img1, TARGET), cv2.COLOR_BGR2YCrCb)
    y2 = cv2.cvtColor(cv2.resize(img2, TARGET), cv2.COLOR_BGR2YCrCb)
    scores = []
    for ch in range(3):
        h1 = cv2.calcHist([y1], [ch], None, [256], [0, 256])
        h2 = cv2.calcHist([y2], [ch], None, [256], [0, 256])
        cv2.normalize(h1, h1)
        cv2.normalize(h2, h2)
        scores.append(cv2.compareHist(h1, h2, cv2.HISTCMP_CORREL))
    return float(np.mean(scores))


def _lbph_similarity(img1: np.ndarray, img2: np.ndarray) -> float:
    """
    Local Binary Pattern histogram comparison.
    Invariant to monotonic brightness shifts. Returns [0, 1].
    """
    def lbp_hist(gray):
        rows, cols = gray.shape
        lbp = np.zeros_like(gray, dtype=np.uint8)
        for i in range(1, rows - 1):
            for j in range(1, cols - 1):
                c = gray[i, j]
                lbp[i, j] = (
                    ((gray[i-1, j-1] >= c) << 7) | ((gray[i-1, j] >= c) << 6) |
                    ((gray[i-1, j+1] >= c) << 5) | ((gray[i,   j+1] >= c) << 4) |
                    ((gray[i+1, j+1] >= c) << 3) | ((gray[i+1, j] >= c) << 2) |
                    ((gray[i+1, j-1] >= c) << 1) | ((gray[i,   j-1] >= c) << 0)
                )
        h = cv2.calcHist([lbp], [0], None, [256], [0, 256])
        cv2.normalize(h, h)
        return h

    g1 = cv2.cvtColor(cv2.resize(img1, (32, 24)), cv2.COLOR_BGR2GRAY)
    g2 = cv2.cvtColor(cv2.resize(img2, (32, 24)), cv2.COLOR_BGR2GRAY)
    return max(0.0, float(cv2.compareHist(lbp_hist(g1), lbp_hist(g2), cv2.HISTCMP_CORREL)))


def _ssim_similarity(img1: np.ndarray, img2: np.ndarray) -> float:
    """
    Structural Similarity Index on grayscale thumbnails.
    Captures edge/structure patterns regardless of brightness.
    Returns [0, 1].
    """
    TARGET = (64, 48)
    g1 = cv2.cvtColor(cv2.resize(img1, TARGET), cv2.COLOR_BGR2GRAY).astype(np.float32)
    g2 = cv2.cvtColor(cv2.resize(img2, TARGET), cv2.COLOR_BGR2GRAY).astype(np.float32)

    C1, C2 = 6.5025, 58.5225  # (0.01*255)^2, (0.03*255)^2
    mu1, mu2 = g1.mean(), g2.mean()
    sig1 = g1.std()
    sig2 = g2.std()
    sig12 = float(np.mean((g1 - mu1) * (g2 - mu2)))

    ssim = ((2*mu1*mu2 + C1) * (2*sig12 + C2)) / \
           ((mu1**2 + mu2**2 + C1) * (sig1**2 + sig2**2 + C2))
    return max(0.0, min(1.0, float(ssim)))


# ─────────────────────────────────────────────────────────────────────────────
# Main verification function
# ─────────────────────────────────────────────────────────────────────────────

def verify_student_face(student_id: int, snapshot_base64: str) -> Tuple[bool, float]:
    """
    Compare a live webcam snapshot against the student's registered face.

    Method (in priority order):
      1. DeepFace VGG-Face neural embedding  — if USE_DEEPFACE=1 in .env
      2. Histogram (YCrCb) + LBP + SSIM fusion — fast, no ML required

    Returns (is_match: bool, confidence: float in [0, 1]).
    """
    registered_path = os.path.join(FACES_DIR, f"student_{student_id}.jpg")
    if not os.path.exists(registered_path):
        print(f"[FaceVerify] No registered face for student {student_id}.")
        return False, 0.0

    temp_fd, temp_path = tempfile.mkstemp(suffix=f"_snap_{student_id}.jpg")
    os.close(temp_fd)

    try:
        snap_img = base64_to_cv2(snapshot_base64)
        cv2.imwrite(temp_path, snap_img, [cv2.IMWRITE_JPEG_QUALITY, 95])

        # ── 1. DeepFace (neural) — opt-in via USE_DEEPFACE=1 ──────────────
        if DEEPFACE_AVAILABLE:
            try:
                _buf = io.StringIO()
                with contextlib.redirect_stdout(_buf), contextlib.redirect_stderr(_buf):
                    result = DeepFace.verify(
                        img1_path=registered_path,
                        img2_path=temp_path,
                        model_name="VGG-Face",
                        distance_metric="cosine",
                        enforce_detection=False,
                        silent=True,
                    )
                distance = float(result.get("distance", 1.0))
                # 0.68 threshold: lenient enough for real webcam conditions
                # (official 0.40 is calibrated for controlled studio photos)
                THRESHOLD = 0.68
                is_match = distance <= THRESHOLD
                confidence = max(0.0, min(1.0, 1.0 - (distance / THRESHOLD)))
                print(
                    f"[FaceVerify] DeepFace student={student_id} "
                    f"dist={distance:.3f} match={is_match} conf={confidence:.0%}"
                )
                return is_match, round(confidence, 3)
            except Exception as e:
                safe = str(e).encode('ascii', errors='replace').decode('ascii')
                print(f"[FaceVerify] DeepFace error, falling back: {safe}")

        # ── 2. Histogram + LBP + SSIM fusion fallback ─────────────────────
        reg_img = cv2.imread(registered_path)
        if reg_img is None or snap_img is None:
            return False, 0.0

        hist = _histogram_similarity(reg_img, snap_img)   # ~[-1, 1]
        lbph = _lbph_similarity(reg_img, snap_img)        # [0, 1]
        ssim = _ssim_similarity(reg_img, snap_img)        # [0, 1]

        # Three-way weighted fusion
        fused = (hist * 0.50) + (lbph * 0.25) + (ssim * 0.25)
        confidence = max(0.0, min(1.0, fused))

        # Threshold 0.55:
        # - Same person, different lighting webcam shots -> ~0.84-0.98 (PASS)
        # - Random noise image                          -> ~0.54       (FAIL)
        # - Completely different person                 -> ~0.05-0.40  (FAIL)
        THRESHOLD = 0.55
        is_match = confidence >= THRESHOLD

        print(
            f"[FaceVerify] Histogram student={student_id} "
            f"hist={hist:.3f} lbph={lbph:.3f} ssim={ssim:.3f} "
            f"fused={confidence:.3f} match={is_match}"
        )
        return is_match, round(confidence, 3)

    except Exception as err:
        safe = str(err).encode('ascii', errors='replace').decode('ascii')
        print(f"[FaceVerify] Error for student {student_id}: {safe}")
        return False, 0.0

    finally:
        try:
            if os.path.exists(temp_path):
                os.remove(temp_path)
        except Exception:
            pass
