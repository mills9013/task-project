/**
 * api.ts — Weather Dashboard API service layer.
 *
 * All network calls go through here. The base URL is read from
 * expo-constants so it can be overridden per environment without
 * touching source code (see app.json → extra.apiBaseUrl).
 */

import Constants from 'expo-constants';
import { Platform } from 'react-native';

// ─── Config ──────────────────────────────────────────────────────────────────

const configuredUrl =
  (Constants.expoConfig?.extra?.apiBaseUrl as string | undefined) ??
  'http://localhost:8000';

// Android emulators need 10.0.2.2 to access the host machine's localhost
const BASE_URL: string =
  Platform.OS === 'android' && configuredUrl.includes('localhost')
    ? configuredUrl.replace('localhost', '10.0.2.2')
    : configuredUrl;

// ─── Types ───────────────────────────────────────────────────────────────────

export interface CurrentWeather {
  temperature_c: number;
  feels_like_c: number;
  humidity_pct: number;
  wind_speed_kmh: number;
  wind_direction_deg: number;
  weather_code: number;
  description: string;
  is_day: boolean;
}

export interface DailyForecast {
  date: string;
  temp_max_c: number;
  temp_min_c: number;
  precipitation_mm: number;
  weather_code: number;
  description: string;
  sunrise: string;
  sunset: string;
}

export interface WeatherData {
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  timezone: string;
  current: CurrentWeather;
  forecast: DailyForecast[];
}

export interface ApiError {
  detail: string;
}

// ─── Fetch helpers ────────────────────────────────────────────────────────────

/**
 * Fetches current weather + 7-day forecast for a given city.
 * Throws an Error with a user-friendly message on failure.
 */
export async function fetchWeather(city: string): Promise<WeatherData> {
  const url = `${BASE_URL}/weather?city=${encodeURIComponent(city)}`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
  } catch {
    throw new Error(
      'Cannot reach the weather service. Please check your network connection.'
    );
  }

  if (!response.ok) {
    let detail = `HTTP ${response.status}`;
    try {
      const err: ApiError = await response.json();
      detail = err.detail ?? detail;
    } catch {
      // ignore JSON parse failures — use the status code message
    }
    throw new Error(detail);
  }

  return response.json() as Promise<WeatherData>;
}

/**
 * Geocodes a city query and returns the first match.
 * Useful for a search/autocomplete flow.
 */
export async function geocodeCity(query: string): Promise<{
  city: string;
  country: string;
  latitude: number;
  longitude: number;
}> {
  const url = `${BASE_URL}/weather/geocode?q=${encodeURIComponent(query)}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    const err: ApiError = await response.json().catch(() => ({ detail: `HTTP ${response.status}` }));
    throw new Error(err.detail);
  }

  return response.json();
}
