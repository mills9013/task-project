"""Weather API backend — Pydantic models."""

from __future__ import annotations

from pydantic import BaseModel, Field


class GeocodingResult(BaseModel):
    city: str
    country: str
    latitude: float
    longitude: float


class CurrentWeather(BaseModel):
    temperature_c: float = Field(..., description="Temperature in Celsius")
    feels_like_c: float = Field(..., description="Feels-like temperature in Celsius")
    humidity_pct: int = Field(..., ge=0, le=100, description="Relative humidity (%)")
    wind_speed_kmh: float = Field(..., description="Wind speed (km/h)")
    wind_direction_deg: int = Field(..., ge=0, le=360, description="Wind direction (°)")
    weather_code: int = Field(..., description="WMO weather interpretation code")
    description: str = Field(..., description="Human-readable weather description")
    is_day: bool


class DailyForecast(BaseModel):
    date: str = Field(..., description="ISO 8601 date (YYYY-MM-DD)")
    temp_max_c: float
    temp_min_c: float
    precipitation_mm: float
    weather_code: int
    description: str
    sunrise: str
    sunset: str


class WeatherResponse(BaseModel):
    city: str
    country: str
    latitude: float
    longitude: float
    timezone: str
    current: CurrentWeather
    forecast: list[DailyForecast] = Field(..., description="7-day daily forecast")


class HealthResponse(BaseModel):
    status: str
    version: str
