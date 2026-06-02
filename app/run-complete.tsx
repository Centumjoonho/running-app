import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    View,
} from 'react-native';
import MapView from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CurrentLocationMarker } from '@/components/map/current-location-marker';
import { RouteEndpointMarkers } from '@/components/map/route-endpoint-markers';
import { RunRoutePolylines } from '@/components/run/run-route-polylines';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { borderRadius, colors, darkMapStyle, overlays, spacing } from '@/src/constants/theme';
import { useCurrentLocation } from '@/hooks/use-current-location';
import { useAuth } from '@/src/contexts/auth-context';
import { useShapeMission } from '@/src/contexts/shape-mission-context';
import {
    formatDistanceKm,
    formatDuration,
    formatPaceSeconds,
    formatRunTitle,
} from '@/src/lib/format';
import { getMapRegionFromCoordinates } from '@/src/lib/geo';
import {
    getRunPointsByRunId,
    getRunSessionById,
    type RunPoint,
    type RunSession,
} from '@/src/lib/runs';

function StatCard({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <View style={styles.statCard}>
      <ThemedText style={styles.statLabel}>{label}</ThemedText>
      <View style={styles.statValueRow}>
        <ThemedText style={styles.statValue}>{value}</ThemedText>
        {unit ? <ThemedText style={styles.statUnit}>{unit}</ThemedText> : null}
      </View>
    </View>
  );
}

export default function RunCompleteScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { session } = useAuth();
  const { clearMission } = useShapeMission();
  const mapRef = useRef<MapView>(null);
  const liveLocation = useCurrentLocation({
    enabled: Platform.OS !== 'web',
    watch: false,
  });

  const [run, setRun] = useState<RunSession | null>(null);
  const [points, setPoints] = useState<RunPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const coordinates = useMemo(
    () => points.map((point) => ({ latitude: point.latitude, longitude: point.longitude })),
    [points],
  );

  const initialRegion = useMemo(
    () => getMapRegionFromCoordinates(coordinates),
    [coordinates],
  );

  useEffect(() => {
    const userId = session?.user?.id;

    if (!id) {
      setError('기록을 찾을 수 없습니다.');
      setIsLoading(false);
      return;
    }

    if (!userId) {
      setError('로그인 정보를 찾을 수 없습니다.');
      setIsLoading(false);
      return;
    }

    const resolvedRunId = id;
    const resolvedUserId = userId;

    let isMounted = true;

    async function loadRun() {
      const [sessionResult, pointsResult] = await Promise.all([
        getRunSessionById(resolvedRunId, resolvedUserId),
        getRunPointsByRunId(resolvedRunId),
      ]);

      if (!isMounted) return;

      if (sessionResult.error || !sessionResult.data) {
        setError(sessionResult.error ?? '기록을 찾을 수 없습니다.');
        setIsLoading(false);
        return;
      }

      setRun(sessionResult.data);
      setPoints(pointsResult.data);
      setError(pointsResult.error);
      setIsLoading(false);
    }

    loadRun();

    return () => {
      isMounted = false;
    };
  }, [id, session?.user?.id]);

  useEffect(() => {
    if (coordinates.length < 2 || !mapRef.current) {
      return;
    }

    mapRef.current.fitToCoordinates(coordinates, {
      edgePadding: { top: 48, right: 48, bottom: 48, left: 48 },
      animated: true,
    });
  }, [coordinates]);

  if (isLoading) {
    return (
      <ThemedView style={styles.centered} darkColor={colors.background} lightColor={colors.background}>
        <ActivityIndicator size="large" color={colors.primary} />
      </ThemedView>
    );
  }

  if (!run) {
    return (
      <ThemedView style={styles.centered} darkColor={colors.background} lightColor={colors.background}>
        <ThemedText style={styles.errorText}>{error ?? '기록을 찾을 수 없습니다.'}</ThemedText>
      </ThemedView>
    );
  }

  const runTitle = formatRunTitle(run.started_at);

  return (
    <ThemedView style={styles.screen} darkColor={colors.background} lightColor={colors.background}>
      <SafeAreaView style={styles.content}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <ThemedText style={styles.badge}>러닝 완료</ThemedText>
          <ThemedText style={styles.headline}>당신이 달린 길이{'\n'}하나의 그림이 되었어요</ThemedText>
          <ThemedText style={styles.runTitle}>{runTitle}</ThemedText>

          <View style={styles.mapContainer}>
            {Platform.OS === 'web' ? (
              <View style={styles.mapFallback}>
                <ThemedText style={styles.mapFallbackText}>
                  지도는 iOS/Android 앱에서 사용할 수 있습니다
                </ThemedText>
              </View>
            ) : coordinates.length === 0 ? (
              <View style={styles.mapFallback}>
                <ThemedText style={styles.mapFallbackText}>
                  {error ?? '경로 데이터가 없습니다'}
                </ThemedText>
              </View>
            ) : (
              <MapView
                ref={mapRef}
                style={styles.map}
                customMapStyle={darkMapStyle}
                userInterfaceStyle="dark"
                scrollEnabled={false}
                zoomEnabled={false}
                rotateEnabled={false}
                pitchEnabled={false}
                showsCompass={false}
                showsScale={false}
                toolbarEnabled={false}
                initialRegion={initialRegion ?? undefined}>
                <RunRoutePolylines coordinates={coordinates} />
                <RouteEndpointMarkers coordinates={coordinates} />
                {liveLocation.status === 'granted' ? (
                  <CurrentLocationMarker coordinate={liveLocation.coordinate} />
                ) : null}
              </MapView>
            )}
          </View>

          <View style={styles.statsRow}>
            <StatCard label="거리" value={formatDistanceKm(run.distance_m)} unit="km" />
            <StatCard label="시간" value={formatDuration(run.duration_seconds)} />
            <StatCard
              label="페이스"
              value={formatPaceSeconds(run.avg_pace_seconds_per_km)}
              unit="/km"
            />
          </View>
        </ScrollView>

        <View style={styles.actions}>
          <Pressable
            style={({ pressed }) => [styles.primaryButton, { opacity: pressed ? 0.88 : 1 }]}
            onPress={() =>
              router.push({ pathname: '/(tabs)/records/[id]', params: { id: run.id } })
            }>
            <ThemedText style={styles.primaryButtonText} lightColor={colors.background} darkColor={colors.background}>
              기록 보기
            </ThemedText>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.secondaryButton, { opacity: pressed ? 0.88 : 1 }]}
            onPress={() => {
              clearMission();
              router.replace('/(tabs)/run');
            }}>
            <ThemedText style={styles.secondaryButtonText}>다시 달리기</ThemedText>
          </Pressable>
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.lg,
    gap: spacing.md,
  },
  badge: {
    alignSelf: 'flex-start',
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
    backgroundColor: overlays.primaryBorder,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  headline: {
    fontSize: 26,
    fontWeight: '700',
    lineHeight: 34,
    color: colors.text,
  },
  runTitle: {
    fontSize: 16,
    color: colors.mutedText,
    marginBottom: spacing.xs,
  },
  mapContainer: {
    height: 240,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: overlays.primaryBorder,
  },
  map: {
    width: '100%',
    height: '100%',
  },
  mapFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
  },
  mapFallbackText: {
    fontSize: 14,
    color: colors.mutedText,
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    gap: spacing.xs,
  },
  statLabel: {
    fontSize: 12,
    color: colors.mutedText,
    fontWeight: '500',
  },
  statValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  statUnit: {
    fontSize: 11,
    color: colors.mutedText,
  },
  actions: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
    gap: spacing.sm,
  },
  primaryButton: {
    height: 56,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    fontSize: 17,
    fontWeight: '700',
  },
  secondaryButton: {
    height: 56,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.text,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  errorText: {
    color: colors.stop,
    textAlign: 'center',
    paddingHorizontal: spacing.xxl,
  },
});
