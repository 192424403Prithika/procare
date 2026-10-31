import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import cv2

from app.routes.moisture import router as moisture_router
from app.routes.acoustic import router as acoustic_router
from app.routes.multi_defect import router as multi_defect_router
from app.routes.forecasting import router as forecasting_router

app = FastAPI(
    title="PropCare NW — Diagnostic Optical & Acoustic Analysis Service",
    description=(
        "High-performance FastAPI service implementing OpenCV specular reflection subtraction "
        "and SciPy/NumPy Fast Fourier Transform (FFT) acoustic leak signal processing."
    ),
    version="1.0.0",
)

# Enable CORS for Next.js web application
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:8000",
    "*",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register route modules
app.include_router(moisture_router)
app.include_router(acoustic_router)
app.include_router(multi_defect_router)
app.include_router(forecasting_router)

@app.get("/")
def root():
    return {
        "service": "PropCare NW Diagnostic Optical & Acoustic Analysis Service",
        "status": "operational",
        "documentation": "/docs",
        "endpoints": {
            "moisture_analysis_json": "POST /api/v1/analyze/moisture",
            "moisture_analysis_upload": "POST /api/v1/analyze/moisture/upload",
            "moisture_engine_health": "GET /api/v1/analyze/moisture/health",
            "acoustic_analysis_json": "POST /api/v1/analyze/acoustic",
            "acoustic_analysis_upload": "POST /api/v1/analyze/acoustic/upload",
            "acoustic_engine_health": "GET /api/v1/analyze/acoustic/health",
        },
        "engine": f"OpenCV {cv2.__version__} & SciPy",
    }

@app.get("/health")
def health():
    return {
        "status": "healthy",
        "opencv": cv2.__version__,
        "pid": os.getpid(),
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
