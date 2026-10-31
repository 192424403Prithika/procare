import os
from typing import List, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field

class Settings(BaseSettings):
    ENVIRONMENT: str = Field(default="development")
    PORT: int = Field(default=8000)
    HOST: str = Field(default="0.0.0.0")
    DEBUG: bool = Field(default=True)

    # MongoDB Atlas
    MONGODB_URI: str = Field(default="mongodb://localhost:27017")
    MONGODB_DATABASE: str = Field(default="propcare_nw")
    MONGODB_MIN_POOL_SIZE: int = Field(default=10)
    MONGODB_MAX_POOL_SIZE: int = Field(default=50)

    # JWT Authentication & Security
    JWT_SECRET_KEY: str = Field(
        default="propcare_nw_development_secret_key_32_characters_minimum_security!"
    )
    JWT_ALGORITHM: str = Field(default="HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(default=1440)  # 24 hours
    REFRESH_TOKEN_EXPIRE_DAYS: int = Field(default=7)

    # Object Storage
    STORAGE_PROVIDER: str = Field(default="local")  # 'local', 'cloudinary', 's3'
    STORAGE_LOCAL_DIR: str = Field(default="./uploads")
    STORAGE_SIGNING_SECRET: str = Field(default="propcare_nw_secure_storage_token_key_2026")
    STORAGE_SIGNED_URL_EXPIRES_SECONDS: int = Field(default=86400)

    # Cloudinary (optional)
    CLOUDINARY_CLOUD_NAME: Optional[str] = None
    CLOUDINARY_API_KEY: Optional[str] = None
    CLOUDINARY_API_SECRET: Optional[str] = None

    # Weather
    OPEN_METEO_BASE_URL: str = Field(default="https://api.open-meteo.com/v1/forecast")
    WEATHER_CACHE_TTL_SECONDS: int = Field(default=3600)  # 1 hour

    # YOLO Moisture & Water Damage Detection
    YOLO_MODEL_PATH: str = Field(default="backend/models/moisture_best.pt")
    YOLO_CONF_THRESHOLD: float = Field(default=0.25)
    YOLO_IOU_THRESHOLD: float = Field(default=0.45)
    YOLO_DEVICE: str = Field(default="cpu")

    # YOLO Structural Breakage & Property Damage Detection
    BREAKAGE_YOLO_MODEL_PATH: str = Field(default="backend/models/breakage_best.pt")
    BREAKAGE_YOLO_CONF_THRESHOLD: float = Field(default=0.25)
    BREAKAGE_YOLO_IOU_THRESHOLD: float = Field(default=0.45)
    BREAKAGE_YOLO_DEVICE: str = Field(default="cpu")

    # Frontend URL & CORS
    FRONTEND_URL: str = Field(default="http://localhost:3000")
    CORS_ORIGINS: List[str] = Field(
        default=[
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "http://localhost:8000",
            "http://127.0.0.1:8000",
        ]
    )

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
