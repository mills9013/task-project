import { SymbolView } from 'expo-symbols';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ExternalLink } from '@/components/external-link';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Collapsible } from '@/components/ui/collapsible';
import { WebBadge } from '@/components/web-badge';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import Constants from 'expo-constants';

const BASE_URL: string =
  (Constants.expoConfig?.extra?.apiBaseUrl as string | undefined) ??
  'http://localhost:8000';

export default function TabTwoScreen() {
  const safeAreaInsets = useSafeAreaInsets();
  const insets = {
    ...safeAreaInsets,
    bottom: safeAreaInsets.bottom + BottomTabInset + Spacing.three,
  };
  const theme = useTheme();
  
  const [healthStatus, setHealthStatus] = useState<string | null>(null);
  const [healthLoading, setHealthLoading] = useState(false);

  const checkHealth = useCallback(async () => {
    setHealthLoading(true);
    setHealthStatus(null);
    try {
      const res = await fetch(`${BASE_URL}/health`);
      if (res.ok) {
        const data = await res.json();
        setHealthStatus(data.status === 'ok' ? 'Online' : 'Degraded');
      } else {
        setHealthStatus('Offline');
      }
    } catch {
      setHealthStatus('Offline');
    } finally {
      setHealthLoading(false);
    }
  }, []);

  useEffect(() => {
    checkHealth();
  }, [checkHealth]);

  const contentPlatformStyle = Platform.select({
    android: {
      paddingTop: insets.top,
      paddingLeft: insets.left,
      paddingRight: insets.right,
      paddingBottom: insets.bottom,
    },
    web: {
      paddingTop: Spacing.six,
      paddingBottom: Spacing.four,
    },
  });

  return (
    <ScrollView
      style={[styles.scrollView, { backgroundColor: theme.background }]}
      contentInset={insets}
      contentContainerStyle={[styles.contentContainer, contentPlatformStyle]}>
      <ThemedView style={styles.container}>
        <ThemedView style={styles.titleContainer}>
          <ThemedText type="subtitle">About & Status</ThemedText>
          <ThemedText style={styles.centerText} themeColor="textSecondary">
            Weather application assessment demo
          </ThemedText>
        </ThemedView>

        <ThemedView style={styles.sectionsWrapper}>
          <ThemedView type="backgroundElement" style={styles.statusCard}>
            <View style={styles.statusHeaderRow}>
              <ThemedText type="defaultSemiBold">Backend Service Status</ThemedText>
              <Pressable onPress={checkHealth} style={styles.refreshIcon}>
                <SymbolView name="arrow.clockwise" size={16} tintColor={theme.tint} />
              </Pressable>
            </View>
            
            {healthLoading ? (
              <ActivityIndicator size="small" color={theme.tint} style={{ alignSelf: 'flex-start', marginTop: 8 }} />
            ) : (
              <View style={styles.statusValueRow}>
                <View style={[styles.statusIndicator, { backgroundColor: healthStatus === 'Online' ? '#34C759' : '#FF3B30' }]} />
                <ThemedText>{healthStatus}</ThemedText>
              </View>
            )}
            <ThemedText type="small" themeColor="textSecondary" style={styles.urlText}>
              {BASE_URL}
            </ThemedText>
          </ThemedView>

          <Collapsible title="Application Architecture">
            <ThemedText type="small">
              • <ThemedText type="smallBold">Frontend:</ThemedText> Expo managed React Native app
            </ThemedText>
            <ThemedText type="small">
              • <ThemedText type="smallBold">Backend:</ThemedText> Python FastAPI service
            </ThemedText>
            <ThemedText type="small">
              • <ThemedText type="smallBold">Deployment:</ThemedText> GitHub Actions to AWS ECR (OIDC) & EAS to TestFlight
            </ThemedText>
          </Collapsible>

          <Collapsible title="Features">
            <ThemedText type="small">
              • Real-time weather data via Open-Meteo API
            </ThemedText>
            <ThemedText type="small">
              • City geocoding and search
            </ThemedText>
            <ThemedText type="small">
              • 7-day daily forecast
            </ThemedText>
            <ThemedText type="small">
              • In-memory 5-minute TTL caching on the backend
            </ThemedText>
          </Collapsible>

          <Collapsible title="Links">
            <ExternalLink href="https://expo.dev">
              <ThemedText type="linkPrimary">Expo Documentation</ThemedText>
            </ExternalLink>
            <ExternalLink href="https://fastapi.tiangolo.com">
              <ThemedText type="linkPrimary">FastAPI Documentation</ThemedText>
            </ExternalLink>
            <ExternalLink href="https://open-meteo.com">
              <ThemedText type="linkPrimary">Open-Meteo API</ThemedText>
            </ExternalLink>
          </Collapsible>
        </ThemedView>
        {Platform.OS === 'web' && <WebBadge />}
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  container: {
    maxWidth: MaxContentWidth,
    flexGrow: 1,
  },
  titleContainer: {
    gap: Spacing.three,
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.six,
  },
  centerText: {
    textAlign: 'center',
  },
  sectionsWrapper: {
    gap: Spacing.five,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
  },
  statusCard: {
    borderRadius: Spacing.three,
    padding: Spacing.four,
  },
  statusHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  refreshIcon: {
    padding: 4,
  },
  statusValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  statusIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  urlText: {
    marginTop: 8,
  },
});
