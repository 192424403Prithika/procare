import datetime
from bson import ObjectId
from app.core.security import hash_password

class UserRole:
    ADMIN = "admin"
    MANAGER = "manager"
    INSPECTOR = "inspector"
    CONTRACTOR = "contractor"

async def seed_initial_data(db):
    """Ensure baseline operational accounts and demo data exist."""
    now_str = datetime.datetime.now(datetime.timezone.utc).isoformat()

    # 1. Seed Users
    users_to_seed = [
        {
            "_id": ObjectId("6723a1000000000000000001"),
            "email": "vaishureddy26096@gmail.com",
            "password_hash": hash_password("vaishu@2623"),
            "full_name": "Vaishu Reddy",
            "organization": "PropCare NW Housing Authority",
            "role": UserRole.MANAGER,
            "title": "Lead Housing Officer",
            "is_active": True,
            "created_at": now_str,
            "updated_at": now_str,
        },
        {
            "_id": ObjectId("6723a1000000000000000002"),
            "email": "admin@propcare.gov.uk",
            "password_hash": hash_password("admin123"),
            "full_name": "Platform Administrator",
            "organization": "PropCare NW Executive",
            "role": UserRole.ADMIN,
            "title": "System Administrator",
            "is_active": True,
            "created_at": now_str,
            "updated_at": now_str,
        },
        {
            "_id": ObjectId("6723a1000000000000000003"),
            "email": "manager@propcare.gov.uk",
            "password_hash": hash_password("manager123"),
            "full_name": "Housing Operations Manager",
            "organization": "PropCare NW Housing",
            "role": UserRole.MANAGER,
            "title": "Senior Housing Officer",
            "is_active": True,
            "created_at": now_str,
            "updated_at": now_str,
        },
        {
            "_id": ObjectId("6723a1000000000000000004"),
            "email": "inspector@propcare.gov.uk",
            "password_hash": hash_password("inspector123"),
            "full_name": "Field Building Inspector",
            "organization": "RICS Northwest Inspections",
            "role": UserRole.INSPECTOR,
            "title": "Chartered Building Surveyor",
            "is_active": True,
            "created_at": now_str,
            "updated_at": now_str,
        },
        {
            "_id": ObjectId("6723a1000000000000000005"),
            "email": "contractor@propcare.gov.uk",
            "password_hash": hash_password("contractor123"),
            "full_name": "Apex Damp Remediation Ltd",
            "organization": "Apex Remediation NW",
            "role": UserRole.CONTRACTOR,
            "title": "Approved Remediation Contractor",
            "is_active": True,
            "created_at": now_str,
            "updated_at": now_str,
        },
    ]

    for u in users_to_seed:
        existing = await db.users.find_one({"email": u["email"]})
        if not existing:
            await db.users.insert_one(u)

    # 2. Seed Sample Properties
    sample_properties = [
        {
            "_id": ObjectId("6723a2000000000000000001"),
            "property_name": "Crescent Heights Block A",
            "address": "42 Crescent Heights, Salford Quays",
            "postal_code": "M50 3UB",
            "city": "Salford",
            "building_type": "Multi-Family Residential",
            "construction_year": 1988,
            "total_units": 24,
            "risk_level": "moderate",
            "overall_health_score": 78,
            "active_alarms": 1,
            "created_at": now_str,
        },
        {
            "_id": ObjectId("6723a2000000000000000002"),
            "property_name": "Deansgate Heritage Lofts",
            "address": "14 Deansgate, City Centre",
            "postal_code": "M3 2BW",
            "city": "Manchester",
            "building_type": "Victorian Conversion",
            "construction_year": 1902,
            "total_units": 18,
            "risk_level": "critical",
            "overall_health_score": 42,
            "active_alarms": 3,
            "created_at": now_str,
        },
        {
            "_id": ObjectId("6723a2000000000000000003"),
            "property_name": "Victoria Mill Terrace",
            "address": "88 Victoria Road",
            "postal_code": "BL1 5RD",
            "city": "Bolton",
            "building_type": "Solid Wall Terraced",
            "construction_year": 1915,
            "total_units": 6,
            "risk_level": "low",
            "overall_health_score": 89,
            "active_alarms": 0,
            "created_at": now_str,
        },
    ]

    for p in sample_properties:
        existing = await db.properties.find_one({"postal_code": p["postal_code"]})
        if not existing:
            await db.properties.insert_one(p)

    # 3. Seed Contractors
    sample_contractors = [
        {
            "_id": ObjectId("6723a3000000000000000001"),
            "name": "Apex Damp Proofing & Insulation",
            "trade": "Damp Proofing",
            "company_name": "Apex Remediation NW Ltd",
            "contact_email": "apex@nwremediation.co.uk",
            "rating": 4.9,
            "completed_jobs": 142,
            "sla_compliance_rate": 0.98,
            "emergency_sla_compliance": 1.0,
            "avg_response_hours": 3.4,
            "verification_status": "verified",
        },
        {
            "_id": ObjectId("6723a3000000000000000002"),
            "name": "Manchester Thermal & Acoustic Surveys",
            "trade": "Acoustic / Thermal",
            "company_name": "Mcr Acoustic Ltd",
            "contact_email": "surveys@mcrsurveys.co.uk",
            "rating": 4.8,
            "completed_jobs": 89,
            "sla_compliance_rate": 0.95,
            "emergency_sla_compliance": 0.96,
            "avg_response_hours": 4.8,
            "verification_status": "verified",
        },
    ]

    for c in sample_contractors:
        existing = await db.contractors.find_one({"name": c["name"]})
        if not existing:
            await db.contractors.insert_one(c)

    # 4. Seed Notifications
    sample_notifications = [
        {
            "_id": ObjectId("6723a4000000000000000001"),
            "title": "Awaab's Law Statutory Alert: 24h Triage Countdown",
            "message": "Category 1 damp hazard reported in Flat 4B, Deansgate Heritage Lofts. Immediate inspection mandated within 24 hours.",
            "category": "statutory",
            "severity": "critical",
            "is_read": False,
            "deadline_hours": 24,
            "created_at": now_str,
        },
        {
            "_id": ObjectId("6723a4000000000000000002"),
            "title": "Severe Weather Met Office Warning: Heavy Rainfall",
            "message": "Greater Manchester psychrometric warning: relative humidity > 92% and 40mm precipitation forecasted.",
            "category": "weather",
            "severity": "high",
            "is_read": False,
            "created_at": now_str,
        },
    ]

    for n in sample_notifications:
        existing = await db.notifications.find_one({"title": n["title"]})
        if not existing:
            await db.notifications.insert_one(n)
