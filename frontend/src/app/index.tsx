/**
 * WeatherScreen — Home tab.
 *
 * Displays current weather conditions and a 7-day forecast
 * sourced from the FastAPI backend (which proxies Open-Meteo).
 *
 * Handles three UI states:
 *   • loading  — spinner while the API call is in-flight
 *   • error    — message + retry button on failure
 *   • success  — current conditions card + forecast list
 */

import { SymbolView } from 'expo-symbols';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  ListRenderItemInfo,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { DailyForecast, WeatherData, fetchWeather } from '@/services/api';

// ─── Weather icon helper ──────────────────────────────────────────────────────

function wmoToSFSymbol(code: number, isDay: boolean): string {
  if (code === 0) return isDay ? 'sun.max.fill' : 'moon.stars.fill';
  if (code <= 2) return isDay ? 'cloud.sun.fill' : 'cloud.moon.fill';
  if (code === 3) return 'cloud.fill';
  if (code <= 48) return 'cloud.fog.fill';
  if (code <= 55) return 'cloud.drizzle.fill';
  if (code <= 65) return 'cloud.rain.fill';
  if (code <= 77) return 'cloud.snow.fill';
  if (code <= 82) return 'cloud.heavyrain.fill';
  if (code <= 86) return 'cloud.snow.fill';
  return 'cloud.bolt.rain.fill';
}

function formatDate(isoDate: string): string {
  const d = new Date(isoDate + 'T12:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function ForecastCard({ item }: { item: DailyForecast }) {
  const theme = useTheme();
  return (
    <ThemedView type="backgroundElement" style={styles.forecastCard}>
      <ThemedText type="small" style={styles.forecastDate}>
        {formatDate(item.date)}
      </ThemedText>
      <SymbolView
        name={wmoToSFSymbol(item.weather_code, true) as never}
        size={20}
        tintColor={theme.tint}
      />
      <ThemedText type="small">{item.description}</ThemedText>
      <View style={styles.forecastTemps}>
        <ThemedText type="smallBold">{Math.round(item.temp_max_c)}°</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {Math.round(item.temp_min_c)}°
        </ThemedText>
      </View>
      {item.precipitation_mm > 0 && (
        <ThemedText type="small" themeColor="textSecondary">
          💧 {item.precipitation_mm.toFixed(1)} mm
        </ThemedText>
      )}
    </ThemedView>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────

const DEFAULT_CITY = 'London';

export default function WeatherScreen() {
  const theme = useTheme();
  const [city, setCity] = useState(DEFAULT_CITY);
  const [inputValue, setInputValue] = useState(DEFAULT_CITY);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (targetCity: string) => {
    Keyboard.dismiss();
    setLoading(true);
    setError(null);
    try {
      const data = await fetchWeather(targetCity);
      setWeather(data);
      setCity(targetCity);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unexpected error. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(DEFAULT_CITY);
  }, [load]);

  const handleSearch = () => {
    const trimmed = inputValue.trim();
    if (trimmed.length > 0) load(trimmed);
  };

  const renderForecastItem = ({ item }: ListRenderItemInfo<DailyForecast>) => (
    <ForecastCard item={item} />
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      {/* ── Search bar ── */}
      <ThemedView style={styles.searchRow}>
        <TextInput
          style={[
            styles.searchInput,
            { color: theme.text, borderColor: theme.tabIconDefault },
          ]}
          placeholder="Search city…"
          placeholderTextColor={theme.textSecondary}
          value={inputValue}
          onChangeText={setInputValue}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
          autoCapitalize="words"
          autoCorrect={false}
          accessibilityLabel="City search input"
        />
        <Pressable
          id="search-btn"
          style={({ pressed }) => [
            styles.searchButton,
            { backgroundColor: theme.tint, opacity: pressed ? 0.8 : 1 },
          ]}
          onPress={handleSearch}
          accessibilityLabel="Search"
          accessibilityRole="button"
        >
          <SymbolView name="magnifyingglass" size={18} tintColor="#fff" />
        </Pressable>
      </ThemedView>

      {/* ── States ── */}
      {loading && (
        <View style={styles.centeredState}>
          <ActivityIndicator size="large" color={theme.tint} />
          <ThemedText type="small" themeColor="textSecondary" style={styles.stateLabel}>
            Fetching weather for {inputValue.trim() || city}…
          </ThemedText>
        </View>
      )}

      {!loading && error && (
        <View style={styles.centeredState}>
          <SymbolView name="exclamationmark.triangle.fill" size={48} tintColor={theme.tabIconDefault} />
          <ThemedText type="subtitle" style={styles.stateLabel}>
            {error}
          </ThemedText>
          <Pressable
            id="retry-btn"
            style={({ pressed }) => [
              styles.retryButton,
              { backgroundColor: theme.tint, opacity: pressed ? 0.8 : 1 },
            ]}
            onPress={() => load(city)}
            accessibilityLabel="Retry"
            accessibilityRole="button"
          >
            <ThemedText type="link" style={{ color: '#fff' }}>
              Retry
            </ThemedText>
          </Pressable>
        </View>
      )}

      {!loading && !error && weather && (
        <FlatList
          data={weather.forecast}
          keyExtractor={(item) => item.date}
          renderItem={renderForecastItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <>
              {/* ── Current conditions ── */}
              <ThemedView type="backgroundElement" style={styles.currentCard}>
                <View style={styles.currentHeader}>
                  <View>
                    <ThemedText type="title">
                      {Math.round(weather.current.temperature_c)}°C
                    </ThemedText>
                    <ThemedText type="subtitle">
                      {weather.city}, {weather.country}
                    </ThemedText>
                    <ThemedText themeColor="textSecondary">
                      {weather.current.description}
                    </ThemedText>
                  </View>
                  <SymbolView
                    name={wmoToSFSymbol(weather.current.weather_code, weather.current.is_day) as never}
                    size={64}
                    tintColor={theme.tint}
                  />
                </View>

                <View style={styles.statsRow}>
                  <View style={styles.statItem}>
                    <SymbolView name="thermometer.medium" size={16} tintColor={theme.tabIconDefault} />
                    <ThemedText type="small">
                      Feels {Math.round(weather.current.feels_like_c)}°C
                    </ThemedText>
                  </View>
                  <View style={styles.statItem}>
                    <SymbolView name="humidity.fill" size={16} tintColor={theme.tabIconDefault} />
                    <ThemedText type="small">{weather.current.humidity_pct}%</ThemedText>
                  </View>
                  <View style={styles.statItem}>
                    <SymbolView name="wind" size={16} tintColor={theme.tabIconDefault} />
                    <ThemedText type="small">
                      {Math.round(weather.current.wind_speed_kmh)} km/h
                    </ThemedText>
                  </View>
                </View>
              </ThemedView>

              <ThemedText type="code" style={styles.sectionLabel}>
                7-DAY FORECAST
              </ThemedText>
            </>
          }
        />
      )}
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  searchRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.two,
  },
  searchInput: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    fontSize: 16,
  },
  searchButton: {
    width: 44,
    height: 44,
    borderRadius: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centeredState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.six,
    gap: Spacing.three,
  },
  stateLabel: {
    textAlign: 'center',
  },
  retryButton: {
    paddingHorizontal: Spacing.five,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.three,
    marginTop: Spacing.two,
  },
  listContent: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.six,
    gap: Spacing.three,
  },
  currentCard: {
    borderRadius: Spacing.four,
    padding: Spacing.four,
    marginBottom: Spacing.three,
    gap: Spacing.three,
  },
  currentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    gap: Spacing.one,
  },
  sectionLabel: {
    marginBottom: Spacing.two,
    textTransform: 'uppercase',
  },
  forecastCard: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  forecastDate: {
    width: 90,
  },
  forecastTemps: {
    flexDirection: 'row',
    gap: Spacing.two,
    alignItems: 'center',
  },
});
