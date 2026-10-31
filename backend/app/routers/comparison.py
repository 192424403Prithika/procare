from typing import Optional, List
from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel, Field

from app.core.database import get_db
from app.core.rbac import require_any_authenticated, require_inspector
from app.services.image_comparison import (
    compare_inspection_images,
    DamageComparisonResult,
)

router = APIRouter(prefix="/api/v1/analyze/compare", tags=["Before-and-After Damage Comparison"])

class ImageComparisonRequest(BaseModel):
    previous_image: str = Field(..., description="Base64 data URI, image URL, or server path of historical inspection photo")
    current_image: str = Field(..., description="Base64 data URI, image URL, or server path of current inspection photo")
    property_id: Optional[str] = None
    inspection_zone: Optional[str] = None
    previous_date: Optional[str] = None
    current_date: Optional[str] = None

@router.post("", response_model=DamageComparisonResult)
async def run_image_comparison(
    payload: ImageComparisonRequest,
    db = Depends(get_db),
    current_user: dict = Depends(require_any_authenticated),
):
    """
    Executes SIFT planar alignment and differential change detection between previous and current inspection photos.
    Stores comparison record in MongoDB 'damage_comparisons' collection.
    """
    try:
        result = compare_inspection_images(
            previous_input=payload.previous_image,
            current_input=payload.current_image,
            property_id=payload.property_id,
            inspection_zone=payload.inspection_zone,
            previous_date=payload.previous_date,
            current_date=payload.current_date,
        )

        doc = result.model_dump()
        doc["user_id"] = current_user.get("id")
        await db.damage_comparisons.insert_one(doc)

        return result
    except ValueError as ve:
        raise HTTPException(status_code=422, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Image comparison analysis failed: {str(e)}")

@router.get("/history/{property_id}")
async def get_comparison_history(
    property_id: str,
    db = Depends(get_db),
    current_user: dict = Depends(require_any_authenticated),
):
    """
    Retrieves previous damage comparison records for a given property.
    """
    history = []
    cursor = db.damage_comparisons.find({"property_id": property_id}).sort("created_at", -1)
    async for doc in cursor:
        doc["id"] = str(doc["_id"])
        del doc["_id"]
        history.append(doc)
    return history
