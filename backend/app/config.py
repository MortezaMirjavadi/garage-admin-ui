"""Environment-driven configuration."""

import os
from pathlib import Path

from dotenv import load_dotenv

BACKEND_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BACKEND_DIR / ".env")


def _origins(value: str) -> list[str]:
    return [origin.strip() for origin in value.split(",") if origin.strip()]


def load_config() -> dict:
    return {
        "HOST": os.getenv("HOST", "127.0.0.1"),
        "PORT": int(os.getenv("PORT", "5000")),
        "DEBUG": os.getenv("FLASK_DEBUG", "0").lower() in ("1", "true", "yes"),
        "GARAGE_ADMIN_URL": os.getenv("GARAGE_ADMIN_URL", "http://127.0.0.1:3903"),
        "GARAGE_ADMIN_TOKEN": os.getenv("GARAGE_ADMIN_TOKEN", ""),
        "GARAGE_S3_ENDPOINT": os.getenv("GARAGE_S3_ENDPOINT", "http://127.0.0.1:3900"),
        "GARAGE_S3_REGION": os.getenv("GARAGE_S3_REGION", "garage"),
        "GARAGE_S3_ACCESS_KEY": os.getenv("GARAGE_S3_ACCESS_KEY", ""),
        "GARAGE_S3_SECRET_KEY": os.getenv("GARAGE_S3_SECRET_KEY", ""),
        "GARAGE_WEBSITE_DOMAIN": os.getenv("GARAGE_WEBSITE_DOMAIN", "web.garage.localhost"),
        "GARAGE_SINGLE_NODE": os.getenv("GARAGE_SINGLE_NODE", "0").lower()
        in ("1", "true", "yes"),
        "MAX_UPLOAD_MB": int(os.getenv("MAX_UPLOAD_MB", "512")),
        "CORS_ORIGINS": _origins(
            os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173")
        ),
    }