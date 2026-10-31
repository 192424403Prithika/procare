import os
import cv2
import scipy
from pathlib import Path
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.core.database import connect_to_mongo, close_mongo_connection, check_db_health
from app.core.storage import ensure_upload_dirs

# Import routers
from app.routers.auth import router as auth_router
from app.routers.users import router as users_router
from app.routers.properties import router as properties_router
from app.routers.inspections import router as inspections_router
from app.routers.optical_analysis import router as optical_router
from app.routers.acoustic_analysis import router as acoustic_router
from app.routers.multi_defect import router as multi_defect_router
from app.routers.forecasting import router as forecasting_router
from app.routers.weather import router as weather_router
from app.routers.triage import router as triage_router
from app.routers.contractors import router as contractors_router
from app.routers.work_orders import router as work_orders_router
from app.routers.reports import router as reports_router
from app.routers.notifications import router as notifications_router
from app.routers.audit import router as audit_router
from app.routers.storage import router as storage_router
from app.routers.digital_twin import router as digital_twin_router
from app.routers.comparison import router as comparison_router
from app.routers.cost_estimator import router as cost_estimator_router
from app.routers.qr import router as qr_router
from app.routers.recommendations import router as recommendations_router
from app.routers.yolo_moisture import router as yolo_moisture_router, compat_router as yolo_moisture_compat_router
from app.routers.yolo_breakage import router as yolo_breakage_router, compat_router as yolo_breakage_compat_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: ensure upload directories and connect to MongoDB Atlas
    ensure_upload_dirs()
    await connect_to_mongo()
    yield
    # Shutdown: close MongoDB connection pool
    await close_mongo_connection()

app = FastAPI(
    title="PropCare NW — Predictive Property Intelligence Backend",
    description=(
        "Production-grade Python FastAPI backend integrating MongoDB Atlas, OpenCV optical difference "
        "analysis, SciPy FFT acoustic signal analysis, Open-Meteo psychrometrics, and Awaab's Law SLA triage."
    ),
    version="2.0.0",
    lifespan=lifespan,
)

# Configure CORS
origins = list(set(settings.CORS_ORIGINS + [settings.FRONTEND_URL, "http://localhost:3000", "http://127.0.0.1:3000"]))
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register route modules
app.include_router(auth_router)
app.include_router(users_router)
app.include_router(properties_router)
app.include_router(inspections_router)
app.include_router(optical_router)
app.include_router(acoustic_router)
app.include_router(multi_defect_router)
app.include_router(forecasting_router)
app.include_router(weather_router)
app.include_router(triage_router)
app.include_router(contractors_router)
app.include_router(work_orders_router)
app.include_router(reports_router)
app.include_router(notifications_router)
app.include_router(audit_router)
app.include_router(storage_router)
app.include_router(digital_twin_router)
app.include_router(comparison_router)
app.include_router(cost_estimator_router)
app.include_router(qr_router)
app.include_router(recommendations_router)
app.include_router(yolo_moisture_router)
app.include_router(yolo_moisture_compat_router)
app.include_router(yolo_breakage_router)
app.include_router(yolo_breakage_compat_router)

# Mount static files for uploaded inspection images and YOLO visual annotations
uploads_dir = Path("uploads")
uploads_dir.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

@app.get("/")
async def root():
    db_health = await check_db_health()
    return {
        "service": "PropCare NW — Predictive Property Intelligence Backend",
        "status": "operational",
        "version": "2.0.0",
        "database": db_health,
        "engines": {
            "opencv": cv2.__version__,
            "scipy": scipy.__version__,
            "storage_provider": settings.STORAGE_PROVIDER,
        },
        "documentation": "/docs",
    }

@app.get("/health")
async def health_check():
    db_health = await check_db_health()
    return {
        "status": "healthy" if db_health["status"] in ["healthy", "connected"] else "degraded",
        "database": db_health,
        "pid": os.getpid(),
        "environment": settings.ENVIRONMENT,
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=True)
