import logging
from typing import Optional
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from pymongo import ASCENDING, DESCENDING
from pymongo.errors import ConnectionFailure, ServerSelectionTimeoutError

from app.core.config import settings
from app.core.mock_db import ResilientDatabase
from app.core.seed_data import seed_initial_data

logger = logging.getLogger("propcare.database")

class Database:
    client: Optional[AsyncIOMotorClient] = None
    db: Optional[AsyncIOMotorDatabase] = None
    resilient_db: ResilientDatabase = ResilientDatabase()
    is_connected: bool = False

db_manager = Database()

async def connect_to_mongo():
    """Establish connection to MongoDB Atlas with connection pooling and resilient fallback."""
    # Always ensure in-memory store is seeded
    await seed_initial_data(db_manager.resilient_db)

    try:
        logger.info(f"Connecting to MongoDB at: {settings.MONGODB_URI.split('@')[-1] if '@' in settings.MONGODB_URI else settings.MONGODB_URI}")
        db_manager.client = AsyncIOMotorClient(
            settings.MONGODB_URI,
            minPoolSize=settings.MONGODB_MIN_POOL_SIZE,
            maxPoolSize=settings.MONGODB_MAX_POOL_SIZE,
            serverSelectionTimeoutMS=2000,
            connectTimeoutMS=2000,
        )
        db_manager.db = db_manager.client[settings.MONGODB_DATABASE]
        
        # Verify connection with ping
        await db_manager.client.admin.command("ping")
        db_manager.is_connected = True
        logger.info(f"Successfully connected to MongoDB Database: '{settings.MONGODB_DATABASE}'")
        
        # Seed and initialize collection indexes on live MongoDB
        await seed_initial_data(db_manager.db)
        await initialize_indexes()
    except (ConnectionFailure, ServerSelectionTimeoutError) as exc:
        db_manager.is_connected = False
        logger.warning(
            f"MongoDB connection failed: {exc}. Server running with resilient in-memory MongoDB store."
        )
    except Exception as exc:
        db_manager.is_connected = False
        logger.error(f"Unexpected error connecting to MongoDB: {exc}. Running with resilient in-memory MongoDB store.")

async def close_mongo_connection():
    """Gracefully close MongoDB client connection."""
    if db_manager.client:
        logger.info("Closing MongoDB connection pool...")
        db_manager.client.close()
        db_manager.is_connected = False
        logger.info("MongoDB connection pool closed.")

async def get_db():
    """Dependency injector to get current database instance (real MongoDB or resilient in-memory)."""
    if db_manager.is_connected and db_manager.db is not None:
        return db_manager.db
    return db_manager.resilient_db

async def check_db_health() -> dict:
    """Performs an active ping check on MongoDB."""
    if not db_manager.client:
        return {"status": "disconnected", "database": settings.MONGODB_DATABASE, "ping_ms": None}
    try:
        import time
        start = time.perf_counter()
        await db_manager.client.admin.command("ping")
        latency_ms = round((time.perf_counter() - start) * 1000, 2)
        return {
            "status": "healthy",
            "database": settings.MONGODB_DATABASE,
            "ping_ms": latency_ms,
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "database": settings.MONGODB_DATABASE,
            "error": str(e),
        }

async def initialize_indexes():
    """Ensure optimized indexes exist across all 17 collections."""
    if db_manager.db is None:
        return

    db = db_manager.db
    try:
        # 1. users
        await db.users.create_index([("email", ASCENDING)], unique=True)
        await db.users.create_index([("role", ASCENDING)])
        await db.users.create_index([("organization_id", ASCENDING)])

        # 2. organizations
        await db.organizations.create_index([("slug", ASCENDING)], unique=True)

        # 3. properties
        await db.properties.create_index([("property_name", ASCENDING)])
        await db.properties.create_index([("postal_code", ASCENDING)])
        await db.properties.create_index([("building_type", ASCENDING)])
        await db.properties.create_index([("risk_level", ASCENDING)])
        await db.properties.create_index([("organization_id", ASCENDING)])
        await db.properties.create_index([("created_at", DESCENDING)])

        # 4. inspections
        await db.inspections.create_index([("property_id", ASCENDING)])
        await db.inspections.create_index([("inspector_id", ASCENDING)])
        await db.inspections.create_index([("status", ASCENDING)])
        await db.inspections.create_index([("created_at", DESCENDING)])

        # 5. inspection_images
        await db.inspection_images.create_index([("inspection_id", ASCENDING)])

        # 6. inspection_audio
        await db.inspection_audio.create_index([("inspection_id", ASCENDING)])

        # 7. image_analysis
        await db.image_analysis.create_index([("inspection_id", ASCENDING)])
        await db.image_analysis.create_index([("created_at", DESCENDING)])

        # 8. acoustic_analysis
        await db.acoustic_analysis.create_index([("inspection_id", ASCENDING)])
        await db.acoustic_analysis.create_index([("created_at", DESCENDING)])

        # 9. weather_records
        await db.weather_records.create_index([("property_id", ASCENDING)])
        await db.weather_records.create_index([("fetched_at", DESCENDING)])

        # 10. risk_assessments
        await db.risk_assessments.create_index([("property_id", ASCENDING)])
        await db.risk_assessments.create_index([("inspection_id", ASCENDING)])
        await db.risk_assessments.create_index([("created_at", DESCENDING)])

        # 11. contractors
        await db.contractors.create_index([("user_id", ASCENDING)], unique=True, sparse=True)
        await db.contractors.create_index([("verification_status", ASCENDING)])
        await db.contractors.create_index([("trade", ASCENDING)])
        await db.contractors.create_index([("company_name", ASCENDING)])

        # 12. contractor_applications
        await db.contractor_applications.create_index([("contractor_id", ASCENDING)])

        # 13. work_orders
        await db.work_orders.create_index([("property_id", ASCENDING)])
        await db.work_orders.create_index([("contractor_id", ASCENDING)])
        await db.work_orders.create_index([("status", ASCENDING)])
        await db.work_orders.create_index([("priority", ASCENDING)])
        await db.work_orders.create_index([("deadline_date", ASCENDING)])

        # 14. maintenance_records
        await db.maintenance_records.create_index([("property_id", ASCENDING)])
        await db.maintenance_records.create_index([("work_order_id", ASCENDING)])

        # 15. reports
        await db.reports.create_index([("property_id", ASCENDING)])
        await db.reports.create_index([("inspection_id", ASCENDING)])
        await db.reports.create_index([("generated_at", DESCENDING)])

        # 16. notifications
        await db.notifications.create_index([("user_id", ASCENDING)])
        await db.notifications.create_index([("is_read", ASCENDING)])
        await db.notifications.create_index([("created_at", DESCENDING)])

        # 17. audit_logs
        await db.audit_logs.create_index([("user_id", ASCENDING)])
        await db.audit_logs.create_index([("target_collection", ASCENDING)])
        await db.audit_logs.create_index([("created_at", DESCENDING)])

        logger.info("MongoDB indexes successfully created for all 17 collections.")
    except Exception as exc:
        logger.warning(f"Could not build indexes: {exc}")
