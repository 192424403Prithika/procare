import os
import mimetypes
from fastapi import APIRouter, HTTPException, Query, status
from fastapi.responses import FileResponse

from app.core.config import settings
from app.core.storage import verify_signed_token, generate_signed_token

router = APIRouter(prefix="/api/v1/storage", tags=["Object Storage"])

@router.get("/file")
async def get_storage_file(
    bucket: str = Query(...),
    path: str = Query(...),
    expires: int = Query(...),
    sig: str = Query(...),
):
    """
    Serves private files from object storage.
    Strictly verifies time-limited HMAC-SHA256 signature to prevent unauthorized or direct access.
    """
    if not verify_signed_token(bucket, path, expires, sig):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Storage signature is invalid, forged, or has expired.",
        )

    # Sanitize path to prevent directory traversal
    clean_path = os.path.normpath(path).lstrip(r"\/.")
    full_path = os.path.join(settings.STORAGE_LOCAL_DIR, clean_path)

    if not os.path.exists(full_path):
        raise HTTPException(status_code=404, detail="Requested file not found in storage.")

    mime_type, _ = mimetypes.guess_type(full_path)
    return FileResponse(full_path, media_type=mime_type or "application/octet-stream")
