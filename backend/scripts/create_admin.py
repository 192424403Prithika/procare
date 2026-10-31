"""
PROPCARE NW — SECURE INITIAL ADMINISTRATOR SETUP SCRIPT
Usage:
    python scripts/create_admin.py --email admin@propcare-nw.com --password YourSecurePassword123! --name "System Administrator"
Or run interactively:
    python scripts/create_admin.py
"""

import sys
import os
import argparse
import asyncio
import getpass
import datetime
from motor.motor_asyncio import AsyncIOMotorClient

# Add parent directory to path to import app modules
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.config import settings
from app.core.security import hash_password
from app.core.rbac import UserRole

async def setup_admin(email: str, password: str, full_name: str, organization: str):
    print(f"\n[PropCare NW] Connecting to database: {settings.MONGODB_DATABASE}...")
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    db = client[settings.MONGODB_DATABASE]

    try:
        await client.admin.command("ping")
        print("[PropCare NW] Database connection verified.")
    except Exception as e:
        print(f"[ERROR] Could not connect to MongoDB: {e}")
        return

    normalized_email = email.lower().strip()
    existing_user = await db.users.find_one({"email": normalized_email})

    now_str = datetime.datetime.now(datetime.timezone.utc).isoformat()
    pwd_hash = hash_password(password)

    if existing_user:
        print(f"[PropCare NW] User '{normalized_email}' already exists. Promoting to PLATFORM ADMIN...")
        await db.users.update_one(
            {"_id": existing_user["_id"]},
            {
                "$set": {
                    "role": UserRole.ADMIN,
                    "password_hash": pwd_hash,
                    "full_name": full_name or existing_user.get("full_name", "System Administrator"),
                    "organization": organization or existing_user.get("organization", "PropCare NW Engineering"),
                    "is_active": True,
                    "updated_at": now_str,
                }
            }
        )
        print(f"[SUCCESS] User '{normalized_email}' is now an active PLATFORM ADMIN.")
    else:
        print(f"[PropCare NW] Creating new initial PLATFORM ADMIN: '{normalized_email}'...")
        user_doc = {
            "email": normalized_email,
            "password_hash": pwd_hash,
            "full_name": full_name,
            "organization": organization,
            "role": UserRole.ADMIN,
            "title": "Platform Administrator & Data Architect",
            "is_active": True,
            "created_at": now_str,
            "updated_at": now_str,
        }
        res = await db.users.insert_one(user_doc)
        print(f"[SUCCESS] Platform Administrator created with ID: {res.inserted_id}")

    # Record in audit log
    await db.audit_logs.insert_one({
        "user_id": "system_bootstrap",
        "action": "admin_initialized",
        "target_collection": "users",
        "target_id": normalized_email,
        "details": {"method": "create_admin_script", "email": normalized_email},
        "created_at": now_str,
    })

    client.close()
    print("[PropCare NW] Bootstrap completed successfully.\n")

def main():
    parser = argparse.ArgumentParser(description="Create or promote initial PropCare NW Platform Administrator.")
    parser.add_argument("--email", help="Administrator email address")
    parser.add_argument("--password", help="Administrator secure password")
    parser.add_argument("--name", default="Dr. Alexander Wright", help="Administrator full name")
    parser.add_argument("--organization", default="PropCare NW Engineering", help="Organization name")

    args = parser.parse_args()

    email = args.email
    password = args.password
    name = args.name
    organization = args.organization

    if not email:
        email = input("Enter Administrator Email: ").strip()
    if not password:
        password = getpass.getpass("Enter Administrator Password (min 8 chars): ").strip()

    if len(password) < 8:
        print("[ERROR] Password must be at least 8 characters.")
        sys.exit(1)

    asyncio.run(setup_admin(email, password, name, organization))

if __name__ == "__main__":
    main()
