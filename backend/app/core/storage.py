import os
import hmac
import hashlib
import time
import uuid
from typing import Tuple, Optional
from fastapi import UploadFile, HTTPException, status
from PIL import Image
import io

from app.core.config import settings

ALLOWED_IMAGE_MIME = {
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
}

ALLOWED_AUDIO_MIME = {
    "audio/wav": ".wav",
    "audio/x-wav": ".wav",
    "audio/mpeg": ".mp3",
    "audio/mp3": ".mp3",
    "audio/ogg": ".ogg",
    "audio/flac": ".flac",
    "audio/x-flac": ".flac",
}

MAX_IMAGE_SIZE_BYTES = 15 * 1024 * 1024  # 15 MB
MAX_AUDIO_SIZE_BYTES = 25 * 1024 * 1024  # 25 MB

def ensure_upload_dirs():
    """Ensure local upload directories exist for private storage."""
    base = settings.STORAGE_LOCAL_DIR
    for bucket in ["inspection-images", "inspection-audio", "contractor-documents", "reports", "heatmaps"]:
        os.makedirs(os.path.join(base, bucket), exist_ok=True)

def generate_signed_token(bucket: str, path: str, expires_in_seconds: int = 86400) -> Tuple[str, int]:
    """Generates an HMAC-SHA256 signature and expiration timestamp for a private file."""
    expires = int(time.time()) + expires_in_seconds
    data = f"{bucket}:{path}:{expires}".encode("utf-8")
    sig = hmac.new(settings.STORAGE_SIGNING_SECRET.encode("utf-8"), data, hashlib.sha256).hexdigest()
    return sig, expires

def verify_signed_token(bucket: str, path: str, expires: int, signature: str) -> bool:
    """Verifies that the HMAC-SHA256 signed URL is valid and unexpired."""
    if int(time.time()) > expires:
        return False
    data = f"{bucket}:{path}:{expires}".encode("utf-8")
    expected = hmac.new(settings.STORAGE_SIGNING_SECRET.encode("utf-8"), data, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature)

def generate_signed_url(bucket: str, relative_path: str, base_url: str = "http://localhost:8000") -> str:
    """Returns a secure signed URL for accessing a protected storage resource."""
    sig, expires = generate_signed_token(bucket, relative_path)
    return f"{base_url}/api/v1/storage/file?bucket={bucket}&path={relative_path}&expires={expires}&sig={sig}"

async def validate_and_save_image(file: UploadFile, bucket: str = "inspection-images") -> Tuple[str, int, str]:
    """
    Validates magic bytes and image integrity, saves to object storage,
    and returns (relative_storage_path, file_size, mime_type).
    """
    ensure_upload_dirs()
    content = await file.read()
    file_size = len(content)

    if file_size == 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded file is empty.")
    if file_size > MAX_IMAGE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Image exceeds maximum allowable size of {MAX_IMAGE_SIZE_BYTES // (1024 * 1024)}MB."
        )

    # Validate image using Pillow to verify actual content, not just extension
    try:
        with Image.open(io.BytesIO(content)) as img:
            img.verify()
            img_format = img.format.lower() if img.format else "jpeg"
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Corrupt or invalid image file: {str(e)}"
        )

    ext = f".{img_format}" if img_format in ["jpeg", "jpg", "png", "webp"] else ".jpg"
    safe_filename = f"{uuid.uuid4().hex}{ext}"
    relative_path = f"{bucket}/{safe_filename}"
    full_path = os.path.join(settings.STORAGE_LOCAL_DIR, relative_path)

    try:
        with open(full_path, "wb") as f:
            f.write(content)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to write image to storage: {str(e)}"
        )

    mime = f"image/{img_format}"
    return relative_path, file_size, mime

async def validate_and_save_audio(file: UploadFile, bucket: str = "inspection-audio") -> Tuple[str, int, str]:
    """
    Validates audio file and saves to private storage.
    """
    ensure_upload_dirs()
    content = await file.read()
    file_size = len(content)

    if file_size == 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded audio file is empty.")
    if file_size > MAX_AUDIO_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Audio exceeds maximum allowable size of {MAX_AUDIO_SIZE_BYTES // (1024 * 1024)}MB."
        )

    # Basic header check (RIFF/WAVE or ID3/MP3 or OGG)
    is_valid = (
        content.startswith(b"RIFF") or  # WAV
        content.startswith(b"ID3") or   # MP3
        content.startswith(b"\xff\xfb") or # MP3 frame
        content.startswith(b"OggS") or  # OGG
        content.startswith(b"fLaC")     # FLAC
    )
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is not a supported audio recording (WAV, MP3, OGG, FLAC)."
        )

    ext = ".wav" if content.startswith(b"RIFF") else (".mp3" if content.startswith(b"ID3") or content.startswith(b"\xff\xfb") else ".ogg")
    safe_filename = f"{uuid.uuid4().hex}{ext}"
    relative_path = f"{bucket}/{safe_filename}"
    full_path = os.path.join(settings.STORAGE_LOCAL_DIR, relative_path)

    with open(full_path, "wb") as f:
        f.write(content)

    return relative_path, file_size, f"audio/{ext.lstrip('.')}"
