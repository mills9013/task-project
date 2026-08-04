"""Weather router — fetches data from Open-Meteo (no API key required)."""

from __future__ import annotations

import logging
from time import time

import httpx
from fastapi import APIRouter, HTTPException, Query

from app.models import DailyForecast, GeocodingResult, WeatherResponse
from app.wmo_codes import wmo_to_description

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/weather", tags=["weather"])

# ---------------------------------------------------------------------------
# Simple in-memory TTL cache (city_lower -> (timestamp, WeatherResponse))
# ---------------------------------------------------------------------------
_CACHE: dict[str, tuple[float, WeatherResponse]] = {}
_CACHE_TTL_SECONDS = 300  # 5 minutes

GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search"
FORECAST_URL = "https://api.open-meteo.com/v1/forecast"


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------


async def _geocode(city: str) -> GeocodingResult:
    """Resolve city name to coordinates using Open-Meteo's geocoding API."""
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(
            GEOCODING_URL,
            params={"name": city, "count": 1, "language": "en", "format": "json"},
        )
        resp.raise_for_status()
        data = resp.json()

    results = data.get("results")
    if not results:
        raise HTTPException(status_code=404, detail=f"City '{city}' not found.")

    r = results[0]
    return GeocodingResult(
        city=r["name"],
        country=r.get("country", ""),
        latitude=r["latitude"],
        longitude=r["longitude"],
    )


async def _fetch_forecast(geo: GeocodingResult) -> WeatherResponse:
    """Fetch current conditions + 7-day daily forecast from Open-Meteo."""
    params = {
        "latitude": geo.latitude,
        "longitude": geo.longitude,
        "current": [
            "temperature_2m",
            "apparent_temperature",
            "relative_humidity_2m",
            "wind_speed_10m",
            "wind_direction_10m",
            "weather_code",
            "is_day",
        ],
        "daily": [
            "temperature_2m_max",
            "temperature_2m_min",
            "precipitation_sum",
            "weather_code",
            "sunrise",
            "sunset",
        ],
        "timezone": "auto",
        "forecast_days": 7,
    }

    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(FORECAST_URL, params=params)
        resp.raise_for_status()
        data = resp.json()

    cur = data["current"]
    daily = data["daily"]
    timezone = data.get("timezone", "UTC")

    current_weather = {
        "temperature_c": cur["temperature_2m"],
        "feels_like_c": cur["apparent_temperature"],
        "humidity_pct": cur["relative_humidity_2m"],
        "wind_speed_kmh": cur["wind_speed_10m"],
        "wind_direction_deg": cur["wind_direction_10m"],
        "weather_code": cur["weather_code"],
        "description": wmo_to_description(cur["weather_code"]),
        "is_day": bool(cur["is_day"]),
    }

    forecast = [
        DailyForecast(
            date=daily["time"][i],
            temp_max_c=daily["temperature_2m_max"][i],
            temp_min_c=daily["temperature_2m_min"][i],
            precipitation_mm=daily["precipitation_sum"][i] or 0.0,
            weather_code=daily["weather_code"][i],
            description=wmo_to_description(daily["weather_code"][i]),
            sunrise=daily["sunrise"][i],
            sunset=daily["sunset"][i],
        )
        for i in range(len(daily["time"]))
    ]

    return WeatherResponse(
        city=geo.city,
        country=geo.country,
        latitude=geo.latitude,
        longitude=geo.longitude,
        timezone=timezone,
        current=current_weather,
        forecast=forecast,
    )


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------


@router.get(
    "",
    response_model=WeatherResponse,
    summary="Get current weather + 7-day forecast",
    description=(
        "Returns current conditions and a 7-day daily forecast for a given city. "
        "Data is sourced from Open-Meteo (no API key required). "
        "Results are cached for 5 minutes per city."
    ),
)
async def get_weather(
    city: str = Query(..., min_length=1, max_length=100, description="City name"),
) -> WeatherResponse:
    """Fetch weather for *city*, with a 5-minute in-memory cache."""
    cache_key = city.strip().lower()
    now = time()

    cached = _CACHE.get(cache_key)
    if cached and (now - cached[0]) < _CACHE_TTL_SECONDS:
        logger.info("Cache hit for city=%s", city)
        return cached[1]

    logger.info("Cache miss — fetching weather for city=%s", city)
    try:
        geo = await _geocode(city)
        result = await _fetch_forecast(geo)
    except HTTPException:
        raise
    except httpx.HTTPStatusError as exc:
        logger.error("Upstream HTTP error: %s", exc)
        raise HTTPException(status_code=502, detail="Upstream weather service error.") from exc
    except httpx.RequestError as exc:
        logger.error("Network error reaching upstream: %s", exc)
        raise HTTPException(
            status_code=503, detail="Weather service temporarily unavailable."
        ) from exc

    _CACHE[cache_key] = (now, result)
    return result


@router.get(
    "/geocode",
    response_model=GeocodingResult,
    summary="Geocode a city name",
    description=(
        "Resolves a city name to coordinates (latitude/longitude). "
        "Useful for search/autocomplete."
    ),
)
async def geocode_city(
    q: str = Query(..., min_length=1, max_length=100, description="City search query"),
) -> GeocodingResult:
    """Return the first geocoding match for query *q*."""
    try:
        return await _geocode(q)
    except HTTPException:
        raise
    except httpx.RequestError as exc:
        logger.error("Geocoding network error: %s", exc)
        raise HTTPException(
            status_code=503, detail="Geocoding service temporarily unavailable."
        ) from exc
