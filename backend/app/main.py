"""Weather API — FastAPI application entry point."""

from __future__ import annotations

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.models import HealthResponse
from app.routers import weather

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s — %(message)s",
)
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------
app = FastAPI(
    title="Weather Dashboard API",
    description=(
        "A production-grade FastAPI service that proxies Open-Meteo "
        "(no API key required) and adds city geocoding, input validation, "
        "and TTL-based response caching."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS — allow the Expo dev server and any configured API base URL.
# In production, tighten origins to your actual domain.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------
app.include_router(weather.router)


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------
@app.get(
    "/health",
    response_model=HealthResponse,
    tags=["ops"],
    summary="Health check",
    description="Liveness probe — returns 200 when the service is ready to handle requests.",
)
async def health() -> HealthResponse:
    """Container orchestration health probe."""
    return HealthResponse(status="ok", version="1.0.0")
