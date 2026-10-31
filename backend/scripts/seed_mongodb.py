"""
PROPCARE NW — SAFE NON-DESTRUCTIVE DATABASE SEED / MIGRATION SCRIPT
Seeds baseline properties, approved contractors, and initial inspections into MongoDB Atlas.
Preserves existing records if already present.
"""

import sys
import os
import asyncio
import datetime
from motor.motor_asyncio import AsyncIOMotorClient

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from app.core.config import settings

SEED_PROPERTIES = [
    {
        "id": "PROP-0914",
        "property_name": "Trinity Court Blocks A-C",
        "address": "42 Chapel Street, Salford",
        "postal_code": "M3 5LE",
        "latitude": 53.4839,
        "longitude": -2.2575,
        "building_type": "Multi-Storey Social Housing (1974 Brick Cavity)",
        "build_year": 1974,
        "number_of_floors": 6,
        "pipe_type": "Copper",
        "roof_membrane_age": 8,
        "risk_level": "critical",
        "risk_score": 89,
        "inspection_status": "Pending Review",
        "last_inspected": "2026-10-28",
        "notes": "Thermal bridging detected behind northern gable wall.",
        "organization": "Greater Manchester Housing Trust",
    },
    {
        "id": "PROP-0422",
        "property_name": "Pendleton Tower Estate",
        "address": "18 Broad Street, Pendleton",
        "postal_code": "M6 5BY",
        "latitude": 53.4912,
        "longitude": -2.2854,
        "building_type": "High-Rise Residential (1968 Reinforced Concrete)",
        "build_year": 1968,
        "number_of_floors": 14,
        "pipe_type": "Galvanized Steel",
        "roof_membrane_age": 12,
        "risk_level": "critical",
        "risk_score": 84,
        "inspection_status": "Pending Review",
        "last_inspected": "2026-10-29",
        "notes": "Acoustic hiss detected on riser pipe 4B.",
        "organization": "Greater Manchester Housing Trust",
    },
    {
        "id": "PROP-0118",
        "property_name": "Ancoats Redrow Terraces",
        "address": "7 Blossom Street, Ancoats",
        "postal_code": "M4 6AJ",
        "latitude": 53.4851,
        "longitude": -2.2289,
        "building_type": "Victorian Solid Brick Conversion",
        "build_year": 1898,
        "number_of_floors": 3,
        "pipe_type": "Copper",
        "roof_membrane_age": 3,
        "risk_level": "moderate",
        "risk_score": 42,
        "inspection_status": "Inspected",
        "last_inspected": "2026-10-20",
        "notes": "Sub-floor timber moisture within acceptable tolerance.",
        "organization": "Greater Manchester Housing Trust",
    },
    {
        "id": "PROP-0552",
        "property_name": "Hulme Moss Side Quarter",
        "address": "112 Princess Road, Moss Side",
        "postal_code": "M14 4TH",
        "latitude": 53.4589,
        "longitude": -2.2392,
        "building_type": "Low-Rise Modular Timber Frame (2012)",
        "build_year": 2012,
        "number_of_floors": 4,
        "pipe_type": "PEX Barrier Pipe",
        "roof_membrane_age": 4,
        "risk_level": "low",
        "risk_score": 18,
        "inspection_status": "Scheduled",
        "last_inspected": "2026-09-15",
        "notes": "MVHR ventilation system operating at optimum efficiency.",
        "organization": "Greater Manchester Housing Trust",
    },
]

SEED_CONTRACTORS = [
    {
        "company_name": "EnviroDry Remediation UK",
        "contact_person": "David Jenkins",
        "email": "dispatch@envirodry-remediation.com",
        "phone": "+44 161 820 4491",
        "location": "Salford & Greater Manchester",
        "trade": "Damp Remediation",
        "accreditation_details": "PCA Certified Damp Remediation Specialist & Constructionline Gold",
        "accreditation_verified": True,
        "verification_status": "Approved",
        "rating": 4.9,
    },
    {
        "company_name": "Apex Acoustic & Thermal Surveys",
        "contact_person": "Fiona Gallagher",
        "email": "surveys@apex-diagnostics.co.uk",
        "phone": "+44 161 744 1129",
        "location": "Manchester & Lancashire",
        "trade": "Acoustic Leak Detection",
        "accreditation_details": "Institute of Acoustics (MIOA) Accredited & Water Loss Association",
        "accreditation_verified": True,
        "verification_status": "Approved",
        "rating": 4.8,
    },
    {
        "company_name": "NorthWest Fluid Dynamics",
        "contact_person": "Callum O'Connor",
        "email": "emergency@nw-fluiddynamics.com",
        "phone": "+44 161 993 0214",
        "location": "Trafford & South Manchester",
        "trade": "Plumbing & Drainage",
        "accreditation_details": "Gas Safe Registered & CIPHE Licensed Master Plumber",
        "accreditation_verified": True,
        "verification_status": "Approved",
        "rating": 4.7,
    },
]

async def seed():
    print(f"\n[PropCare NW] Connecting to MongoDB: {settings.MONGODB_DATABASE}...")
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    db = client[settings.MONGODB_DATABASE]

    try:
        await client.admin.command("ping")
        print("[PropCare NW] Database online.")
    except Exception as e:
        print(f"[ERROR] Could not connect: {e}")
        return

    now_str = datetime.datetime.now(datetime.timezone.utc).isoformat()

    # 1. Properties
    for prop in SEED_PROPERTIES:
        existing = await db.properties.find_one({"property_name": prop["property_name"]})
        if not existing:
            doc = {**prop, "created_at": now_str, "updated_at": now_str, "is_archived": False}
            res = await db.properties.insert_one(doc)
            print(f" [+] Inserted property: {prop['property_name']} ({res.inserted_id})")
        else:
            print(f" [~] Property exists: {prop['property_name']}")

    # 2. Contractors
    for cont in SEED_CONTRACTORS:
        existing = await db.contractors.find_one({"email": cont["email"]})
        if not existing:
            doc = {**cont, "created_at": now_str, "updated_at": now_str}
            res = await db.contractors.insert_one(doc)
            print(f" [+] Inserted contractor: {cont['company_name']} ({res.inserted_id})")
        else:
            print(f" [~] Contractor exists: {cont['company_name']}")

    client.close()
    print("[PropCare NW] Seeding complete.\n")

if __name__ == "__main__":
    asyncio.run(seed())
