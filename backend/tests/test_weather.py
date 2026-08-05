"""Tests for the Weather Dashboard API."""

from __future__ import annotations

import pytest
import respx
from httpx import AsyncClient, Response

from app.main import app

# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

GEOCODING_PAYLOAD = {
    "results": [
        {
            "name": "London",
            "country": "United Kingdom",
            "latitude": 51.5085,
            "longitude": -0.1257,
        }
    ]
}

FORECAST_PAYLOAD = {
    "timezone": "Europe/London",
    "current": {
        "temperature_2m": 15.3,
        "apparent_temperature": 13.1,
        "relative_humidity_2m": 72,
        "wind_speed_10m": 18.5,
        "wind_direction_10m": 230,
        "weather_code": 2,
        "is_day": 1,
    },
    "daily": {
        "time": [
            "2025-01-01", "2025-01-02", "2025-01-03", "2025-01-04",
            "2025-01-05", "2025-01-06", "2025-01-07",
        ],
        "temperature_2m_max": [16.0, 17.5, 15.0, 14.0, 18.0, 19.0, 20.0],
        "temperature_2m_min": [10.0, 11.0, 9.5, 8.0, 12.0, 13.0, 14.0],
        "precipitation_sum": [0.0, 2.3, 0.0, 5.1, 0.0, 0.0, 1.0],
        "weather_code": [2, 63, 1, 80, 0, 0, 51],
        "sunrise": [
            "2025-01-01T08:06", "2025-01-02T08:06", "2025-01-03T08:06",
            "2025-01-04T08:06", "2025-01-05T08:06", "2025-01-06T08:06", "2025-01-07T08:06",
        ],
        "sunset": [
            "2025-01-01T16:01", "2025-01-02T16:02", "2025-01-03T16:03",
            "2025-01-04T16:04", "2025-01-05T16:05", "2025-01-06T16:06", "2025-01-07T16:07",
        ],
    },
}


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_health_returns_ok() -> None:
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.get("/health")

    assert response.status_code == 500  # DELIBERATELY BROKEN TO TEST CI PIPELINE
    body = response.json()
    assert body["status"] == "ok"
    assert "version" in body


# ---------------------------------------------------------------------------
# GET /weather
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
@respx.mock
async def test_get_weather_success() -> None:
    """Happy path: valid city returns structured weather data."""
    respx.get("https://geocoding-api.open-meteo.com/v1/search").mock(
        return_value=Response(200, json=GEOCODING_PAYLOAD)
    )
    respx.get("https://api.open-meteo.com/v1/forecast").mock(
        return_value=Response(200, json=FORECAST_PAYLOAD)
    )

    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.get("/weather?city=London")

    assert response.status_code == 200
    body = response.json()

    assert body["city"] == "London"
    assert body["country"] == "United Kingdom"
    assert "current" in body
    assert "forecast" in body
    assert len(body["forecast"]) == 7

    current = body["current"]
    assert current["temperature_c"] == 15.3
    assert current["humidity_pct"] == 72
    assert current["description"] == "Partly cloudy"
    assert current["is_day"] is True


@pytest.mark.asyncio
@respx.mock
async def test_get_weather_city_not_found() -> None:
    """Geocoding returns no results → 404."""
    respx.get("https://geocoding-api.open-meteo.com/v1/search").mock(
        return_value=Response(200, json={"results": []})
    )

    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.get("/weather?city=Nonexistent_XYZ_City")

    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_get_weather_missing_city_param() -> None:
    """Calling /weather without ?city= returns 422 validation error."""
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.get("/weather")

    assert response.status_code == 422


# ---------------------------------------------------------------------------
# GET /weather/geocode
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
@respx.mock
async def test_geocode_success() -> None:
    respx.get("https://geocoding-api.open-meteo.com/v1/search").mock(
        return_value=Response(200, json=GEOCODING_PAYLOAD)
    )

    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.get("/weather/geocode?q=London")

    assert response.status_code == 200
    body = response.json()
    assert body["city"] == "London"
    assert body["latitude"] == pytest.approx(51.5085, rel=1e-3)


@pytest.mark.asyncio
@respx.mock
async def test_geocode_city_not_found() -> None:
    respx.get("https://geocoding-api.open-meteo.com/v1/search").mock(
        return_value=Response(200, json={"results": []})
    )

    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.get("/weather/geocode?q=ZZZNONEXISTENT")

    assert response.status_code == 404
