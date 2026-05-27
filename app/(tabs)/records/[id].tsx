import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Platform, ScrollView, StyleSheet, View } from 'react-native';
import MapView from 'react-native-maps';

import { RunRoutePolylines } from '@/components/run/run-route-polylines';
import { ThemedText } from '@/components/themed-text';
import { MyleStatCard, myleStatRowStyles } from '@/components/ui/myle-stat-card';
import { MyleScreen, myleScreenStyles } from '@/components/ui/myle-screen';
import {
  borderRadius,
  colors,
  darkMapStyle,
  runMap,
  spacing,
} from '@/src/constants/theme';
import {
  formatDistanceKm,
  formatDuration,
  formatPaceSeconds,
  formatRunDate,
} from '@/src/lib/format';
import {
  fetchRunPoints,
  fetchRunSessionById,
  type RunPoint,
  type RunSession,
} from '@/src/lib/runs';

const MAP_DELTA = runMap.regionDelta;

export default function RecordDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const mapRef = useRef<MapView>(null);
  const [run, setRun] = useState<RunSession | null>(null);
  const [points, setPoints] = useState<RunPoint[]>([]);
  const [pointsError, setPointsError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const coordinates = useMemo(
    () => points.map((point) => ({ latitude: point.latitude, longitude: point.longitude })),
    [points],
  );

  const initialRegion = useMemo(() => {
    if (coordinates.length === 0) {
      return null;
    }

    if (coordinates.length === 1) {
      return {
        latitude: coordinates[0].latitude,
        longitude: coordinates[0].longitude,
        latitudeDelta: MAP_DELTA,
        longitudeDelta: MAP_DELTA,
      };
    }

    let minLat = coordinates[0].latitude;
    let maxLat = coordinates[0].latitude;
    let minLng = coordinates[0].longitude;
    let maxLng = coordinates[0].longitude;

    for (const coordinate of coordinates) {
      minLat = Math.min(minLat, coordinate.latitude);
      maxLat = Math.max(maxLat, coordinate.latitude);
      minLng = Math.min(minLng, coordinate.longitude);
      maxLng = Math.max(maxLng, coordinate.longitude);
    }

    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
      latitudeDelta: Math.max((maxLat - minLat) * 1.4, MAP_DELTA),
      longitudeDelta: Math.max((maxLng - minLng) * 1.4, MAP_DELTA),
    };
  }, [coordinates]);

  useEffect(() => {
    if (!id) {
      setError('기록을 찾을 수 없습니다.');
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    async function loadRun() {
      const [sessionResult, pointsResult] = await Promise.all([
        fetchRunSessionById(id),
        fetchRunPoints(id),
      ]);

      if (!isMounted) return;

      if (sessionResult.error) {
        setError(sessionResult.error);
        setIsLoading(false);
        return;
      }

      if (!sessionResult.data) {
        setError('기록을 찾을 수 없습니다.');
        setIsLoading(false);
        return;
      }

      setRun(sessionResult.data);
      setPoints(pointsResult.data);
      setPointsError(pointsResult.error);
      setError(null);
      setIsLoading(false);
    }

    loadRun();

    return () => {
      isMounted = false;
    };
  }, [id]);

  useEffect(() => {
    if (coordinates.length < 2 || !mapRef.current) {
      return;
    }

    mapRef.current.fitToCoordinates(coordinates, {
      edgePadding: { top: 48, right: 48, bottom: 48, left: 48 },
      animated: false,
    });
  }, [coordinates]);

  if (isLoading) {
    return (
      <MyleScreen safe={false}>
        <View style={myleScreenStyles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </MyleScreen>
    );
  }

  if (error || !run) {
    return (
      <MyleScreen safe={false}>
        <View style={myleScreenStyles.centered}>
          <ThemedText style={myleScreenStyles.errorText}>
            {error ?? '기록을 찾을 수 없습니다.'}
          </ThemedText>
        </View>
      </MyleScreen>
    );
  }

  const stats = [
    { label: '거리', value: formatDistanceKm(run.distance_m), unit: 'km' },
    { label: '시간', value: formatDuration(run.duration_seconds), unit: '' },
    {
      label: '페이스',
      value: formatPaceSeconds(run.avg_pace_seconds_per_km),
      unit: '/km',
    },
  ] as const;

  return (
    <MyleScreen safe={false}>
      <ScrollView contentContainerStyle={styles.content}>
        <ThemedText style={styles.date}>{formatRunDate(run.started_at)}</ThemedText>

        <View style={styles.mapContainer}>
          {Platform.OS === 'web' ? (
            <View style={styles.mapFallback}>
              <ThemedText style={styles.mapHint}>지도는 iOS/Android 앱에서 사용할 수 있습니다</ThemedText>
            </View>
          ) : coordinates.length === 0 ? (
            <View style={styles.mapFallback}>
              <ThemedText style={styles.mapHint}>{pointsError ?? '경로 데이터가 없습니다'}</ThemedText>
            </View>
          ) : (
            <MapView
              ref={mapRef}
              style={styles.map}
              initialRegion={initialRegion ?? undefined}
              customMapStyle={darkMapStyle}
              userInterfaceStyle="dark">
              <RunRoutePolylines coordinates={coordinates} />
            </MapView>
          )}
        </View>

        <View style={myleStatRowStyles.row}>
          {stats.map((stat) => (
            <MyleStatCard key={stat.label} label={stat.label} value={stat.value} unit={stat.unit} />
          ))}
        </View>
      </ScrollView>
    </MyleScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.xl,
    gap: spacing.lg,
  },
  date: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
  },
  mapContainer: {
    height: runMap.minHeight,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
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
  mapHint: {
    fontSize: 14,
    textAlign: 'center',
    color: colors.mutedText,
  },
});
