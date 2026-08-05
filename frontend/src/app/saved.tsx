import { SymbolView } from 'expo-symbols';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export default function SavedCitiesScreen() {
  const safeAreaInsets = useSafeAreaInsets();
  const insets = {
    ...safeAreaInsets,
    bottom: safeAreaInsets.bottom + BottomTabInset + Spacing.three,
  };
  const theme = useTheme();
  const router = useRouter();
  
  const [savedCities, setSavedCities] = useState<string[]>([]);

  const loadSavedCities = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem('savedCities');
      if (stored) {
        setSavedCities(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed to load saved cities', e);
    }
  }, []);

  // Reload the cities whenever this tab comes into focus
  useFocusEffect(
    useCallback(() => {
      loadSavedCities();
    }, [loadSavedCities])
  );

  const removeCity = async (cityToRemove: string) => {
    const updated = savedCities.filter((c) => c !== cityToRemove);
    setSavedCities(updated);
    await AsyncStorage.setItem('savedCities', JSON.stringify(updated));
  };

  const navigateToCity = (city: string) => {
    router.navigate({ pathname: '/', params: { city } });
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background, paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <ThemedView style={styles.titleContainer}>
        <ThemedText type="subtitle">Saved Cities</ThemedText>
      </ThemedView>

      {savedCities.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="star" size={48} color={theme.tabIconDefault} />
          <ThemedText type="defaultSemiBold" style={{ marginTop: Spacing.three }}>
            No saved cities yet.
          </ThemedText>
          <ThemedText themeColor="textSecondary" style={styles.centerText}>
            Search for a city on the Weather tab and tap the star icon to save it here.
          </ThemedText>
        </View>
      ) : (
        <FlatList
          data={savedCities}
          keyExtractor={(item) => item}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <Pressable
              style={({ pressed }) => [
                styles.cityCard,
                { backgroundColor: theme.backgroundElement, opacity: pressed ? 0.8 : 1 }
              ]}
              onPress={() => navigateToCity(item)}
            >
              <ThemedText type="defaultSemiBold" style={styles.cityName}>
                {item}
              </ThemedText>
              <Pressable
                onPress={() => removeCity(item)}
                hitSlop={16}
                style={styles.deleteButton}
              >
                <Ionicons name="trash" size={18} color={theme.textSecondary} />
              </Pressable>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  titleContainer: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.four,
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(150, 150, 150, 0.2)',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.six,
  },
  centerText: {
    textAlign: 'center',
    marginTop: Spacing.one,
  },
  listContent: {
    padding: Spacing.four,
    gap: Spacing.three,
  },
  cityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.four,
    borderRadius: Spacing.three,
  },
  cityName: {
    flex: 1,
  },
  deleteButton: {
    padding: Spacing.one,
  },
});
