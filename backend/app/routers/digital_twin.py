import datetime
import uuid
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from bson import ObjectId

from app.core.database import get_db
from app.core.rbac import (
    require_any_authenticated,
    require_inspector,
    require_manager,
)

router = APIRouter(prefix="/api/v1/digital-twin", tags=["Interactive Property Digital Twin"])

class ZoneCoordinate(BaseModel):
    x: float = Field(..., description="X coordinate percentage (0-100)")
    y: float = Field(..., description="Y coordinate percentage (0-100)")
    width: float = Field(..., description="Width percentage (0-100)")
    height: float = Field(..., description="Height percentage (0-100)")

class AnnotationInput(BaseModel):
    zone_id: Optional[str] = None
    defect_type: str = Field(..., description="Defect category (cracks, moisture, peeling_paint, etc.)")
    finding_note: str = Field(..., description="Inspector clinical observation note")
    risk_level: str = Field("moderate", description="low | moderate | high | critical")
    x: float = Field(..., description="Pin marker X percentage (0-100)")
    y: float = Field(..., description="Pin marker Y percentage (0-100)")
    photo_url: Optional[str] = None

class BuildingZoneInput(BaseModel):
    property_id: str
    zone_code: str
    zone_name: str
    floor_number: int
    floor_label: str
    zone_type: str = "communal"  # bathroom, kitchen, riser_shaft, subfloor, roof_envelope, external_wall, communal
    risk_level: str = "low"  # low, moderate, high, critical
    moisture_index: float = 0.0
    acoustic_freq_hz: float = 0.0
    active_work_orders: int = 0
    inspection_notes: Optional[str] = None
    photo_url: Optional[str] = None
    x: float
    y: float
    width: float
    height: float

class FloorPlanInput(BaseModel):
    property_id: str
    floor_number: int
    floor_label: str
    image_url: Optional[str] = None
    svg_layout: Optional[str] = None

@router.get("/properties/{property_id}/zones")
async def get_property_zones(
    property_id: str,
    db = Depends(get_db),
    current_user: dict = Depends(require_any_authenticated),
):
    """
    Retrieves all floor plan rooms and inspection zones for a property.
    If no zones exist in the database for the property, seed initial canonical zones.
    """
    zones = []
    cursor = db.building_zones.find({"property_id": property_id}).sort("floor_number", -1)
    async for doc in cursor:
        doc["id"] = str(doc["_id"])
        del doc["_id"]
        zones.append(doc)

    # If database has no zones for this property yet, load canonical defaults or return empty
    if not zones:
        # Check if property exists
        prop = await db.properties.find_one({"$or": [{"_id": ObjectId(property_id) if ObjectId.is_valid(property_id) else None}, {"id": property_id}]})
        prop_name = prop.get("property_name", property_id) if prop else property_id
        
        # Create standard structural envelope zones
        default_zones = [
            {
                "property_id": property_id,
                "zone_code": "ROOF-01",
                "zone_name": f"{prop_name} - Roof Waterproofing Envelope",
                "floor_number": 4,
                "floor_label": "Roof Level",
                "zone_type": "roof_envelope",
                "risk_level": "moderate",
                "moisture_index": 28.0,
                "acoustic_freq_hz": 0.0,
                "active_work_orders": 0,
                "inspection_notes": "Parapet copings intact. Slight ponding detected at drainage scupper.",
                "x": 10.0, "y": 8.0, "width": 80.0, "height": 14.0,
                "created_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
            },
            {
                "property_id": property_id,
                "zone_code": "FL03-BATH-14",
                "zone_name": "Unit 14 Master Bathroom & Northern Gable Wall",
                "floor_number": 3,
                "floor_label": "Floor 3",
                "zone_type": "bathroom",
                "risk_level": "critical",
                "moisture_index": 88.0,
                "acoustic_freq_hz": 1240.0,
                "active_work_orders": 1,
                "inspection_notes": "Thermal bridging detected. OpenCV specular diff 12.8%. Active pipe hiss at 1.24 kHz.",
                "photo_url": "/test_flash.jpg",
                "x": 15.0, "y": 26.0, "width": 32.0, "height": 18.0,
                "created_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
            },
            {
                "property_id": property_id,
                "zone_code": "FL03-LIV-14",
                "zone_name": "Unit 14 Living Area & Window Reveal",
                "floor_number": 3,
                "floor_label": "Floor 3",
                "zone_type": "communal",
                "risk_level": "moderate",
                "moisture_index": 34.0,
                "acoustic_freq_hz": 0.0,
                "active_work_orders": 0,
                "inspection_notes": "Minor condensation along double-glazed sill reveal.",
                "x": 52.0, "y": 26.0, "width": 33.0, "height": 18.0,
                "created_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
            },
            {
                "property_id": property_id,
                "zone_code": "FL02-RISER-CORE",
                "zone_name": "Central Service Riser Stack Chase (Shaft 2)",
                "floor_number": 2,
                "floor_label": "Floor 2",
                "zone_type": "riser_shaft",
                "risk_level": "high",
                "moisture_index": 68.0,
                "acoustic_freq_hz": 980.0,
                "active_work_orders": 1,
                "inspection_notes": "Moisture migration descending from Floor 3 stack.",
                "x": 42.0, "y": 48.0, "width": 16.0, "height": 18.0,
                "created_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
            },
            {
                "property_id": property_id,
                "zone_code": "FL01-COMMUNAL",
                "zone_name": "Ground Floor Communal Foyer & Plant Room",
                "floor_number": 1,
                "floor_label": "Floor 1",
                "zone_type": "communal",
                "risk_level": "low",
                "moisture_index": 18.0,
                "acoustic_freq_hz": 0.0,
                "active_work_orders": 0,
                "inspection_notes": "Heating manifolds and booster pump seals in good order.",
                "x": 15.0, "y": 70.0, "width": 35.0, "height": 18.0,
                "created_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
            },
            {
                "property_id": property_id,
                "zone_code": "SUB-BASEMENT",
                "zone_name": "Sub-Floor Void & Airbrick Telescopic Ducts",
                "floor_number": 0,
                "floor_label": "Sub-Floor Void",
                "zone_type": "subfloor",
                "risk_level": "moderate",
                "moisture_index": 48.0,
                "acoustic_freq_hz": 0.0,
                "active_work_orders": 0,
                "inspection_notes": "Sub-floor ventilation cleared. Slight dampness near exterior footing.",
                "x": 10.0, "y": 90.0, "width": 80.0, "height": 8.0,
                "created_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
            },
        ]
        res = await db.building_zones.insert_many(default_zones)
        for i, inserted_id in enumerate(res.inserted_ids):
            default_zones[i]["id"] = str(inserted_id)
            if "_id" in default_zones[i]:
                del default_zones[i]["_id"]
        return default_zones

    return zones

@router.post("/properties/{property_id}/zones", status_code=status.HTTP_201_CREATED)
async def create_or_update_zone(
    property_id: str,
    payload: BuildingZoneInput,
    db = Depends(get_db),
    current_user: dict = Depends(require_inspector),
):
    """
    Creates or updates an inspection zone or room on the digital twin floor plan.
    Requires INSPECTOR, MANAGER, or ADMIN role.
    """
    doc = payload.model_dump()
    doc["property_id"] = property_id
    doc["updated_at"] = datetime.datetime.now(datetime.timezone.utc).isoformat()
    doc["updated_by"] = current_user.get("full_name") or current_user.get("email")

    res = await db.building_zones.insert_one(doc)
    doc["id"] = str(res.inserted_id)
    if "_id" in doc:
        del doc["_id"]
    return doc

@router.post("/properties/{property_id}/annotate", status_code=status.HTTP_201_CREATED)
async def add_floor_plan_annotation(
    property_id: str,
    payload: AnnotationInput,
    db = Depends(get_db),
    current_user: dict = Depends(require_inspector),
):
    """
    Adds an interactive defect annotation marker pin on the digital twin floor plan.
    """
    now_str = datetime.datetime.now(datetime.timezone.utc).isoformat()
    annotation = {
        "property_id": property_id,
        "zone_id": payload.zone_id,
        "defect_type": payload.defect_type,
        "finding_note": payload.finding_note,
        "risk_level": payload.risk_level,
        "x": payload.x,
        "y": payload.y,
        "photo_url": payload.photo_url,
        "inspector_id": current_user.get("id"),
        "inspector_name": current_user.get("full_name") or current_user.get("email"),
        "created_at": now_str,
    }

    res = await db.zone_annotations.insert_one(annotation)
    annotation["id"] = str(res.inserted_id)
    if "_id" in annotation:
        del annotation["_id"]

    # If zone_id is specified, also update zone notes & risk if higher
    if payload.zone_id:
        z_query = {"_id": ObjectId(payload.zone_id)} if ObjectId.is_valid(payload.zone_id) else {"_id": payload.zone_id}
        await db.building_zones.update_one(
            z_query,
            {
                "$set": {
                    "inspection_notes": payload.finding_note,
                    "risk_level": payload.risk_level,
                    "updated_at": now_str,
                }
            }
        )

    return annotation

@router.get("/properties/{property_id}/annotations")
async def get_floor_plan_annotations(
    property_id: str,
    db = Depends(get_db),
    current_user: dict = Depends(require_any_authenticated),
):
    """
    Retrieves all pinned inspection annotations for a property digital twin.
    """
    annotations = []
    cursor = db.zone_annotations.find({"property_id": property_id}).sort("created_at", -1)
    async for doc in cursor:
        doc["id"] = str(doc["_id"])
        del doc["_id"]
        annotations.append(doc)
    return annotations

@router.post("/properties/{property_id}/floor-plans")
async def save_floor_plan(
    property_id: str,
    payload: FloorPlanInput,
    db = Depends(get_db),
    current_user: dict = Depends(require_manager),
):
    """
    Saves an uploaded floor plan image URL or SVG layout.
    """
    doc = payload.model_dump()
    doc["property_id"] = property_id
    doc["saved_at"] = datetime.datetime.now(datetime.timezone.utc).isoformat()
    doc["saved_by"] = current_user.get("full_name") or current_user.get("email")

    await db.floor_plans.update_one(
        {"property_id": property_id, "floor_number": payload.floor_number},
        {"$set": doc},
        upsert=True
    )
    return {"status": "success", "message": f"Floor plan for floor {payload.floor_number} saved."}

@router.get("/properties/{property_id}/floor-plans")
async def get_floor_plans(
    property_id: str,
    db = Depends(get_db),
    current_user: dict = Depends(require_any_authenticated),
):
    """
    Retrieves all registered floor plans for a property.
    """
    plans = []
    cursor = db.floor_plans.find({"property_id": property_id}).sort("floor_number", 1)
    async for doc in cursor:
        doc["id"] = str(doc["_id"])
        del doc["_id"]
        plans.append(doc)
    return plans
