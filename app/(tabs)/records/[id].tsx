import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Platform, ScrollView, StyleSheet, View } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
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

const MAP_DELTA = 0.01;

export default function RecordDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const mapBackground = colorScheme === 'dark' ? '#2C2C2E' : '#E8E8ED';
  const mapIconColor = colorScheme === 'dark' ? '#636366' : '#AEAEB2';
  const cardBackground = colorScheme === 'dark' ? '#1C1C1E' : '#F2F2F7';

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
      <ThemedView style={styles.centered}>
        <ActivityIndicator size="large" color={theme.tint} />
      </ThemedView>
    );
  }

  if (error || !run) {
    return (
      <ThemedView style={styles.centered}>
        <ThemedText style={styles.errorText}>{error ?? '기록을 찾을 수 없습니다.'}</ThemedText>
      </ThemedView>
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
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <ThemedText type="title" style={styles.date}>
          {formatRunDate(run.started_at)}
        </ThemedText>

        <View style={[styles.mapContainer, { backgroundColor: mapBackground }]}>
          {Platform.OS === 'web' ? (
            <View style={styles.mapFallback}>
              <ThemedText style={[styles.mapHint, { color: mapIconColor }]}>
                지도는 iOS/Android 앱에서 사용할 수 있습니다
              </ThemedText>
            </View>
          ) : coordinates.length === 0 ? (
            <View style={styles.mapFallback}>
              <ThemedText style={[styles.mapHint, { color: mapIconColor }]}>
                {pointsError ?? '경로 데이터가 없습니다'}
              </ThemedText>
            </View>
          ) : (
            <MapView ref={mapRef} style={styles.map} initialRegion={initialRegion ?? undefined}>
              {coordinates.length >= 2 ? (
                <Polyline coordinates={coordinates} strokeColor={theme.tint} strokeWidth={4} />
              ) : null}
              <Marker coordinate={coordinates[coordinates.length - 1]} title="종료 위치" />
            </MapView>
          )}
        </View>

        <View style={styles.statsRow}>
          {stats.map((stat) => (
            <View key={stat.label} style={[styles.statCard, { backgroundColor: cardBackground }]}>
              <ThemedText style={styles.statLabel}>{stat.label}</ThemedText>
              <ThemedText style={styles.statValue}>{stat.value}</ThemedText>
              {stat.unit ? (
                <ThemedText style={styles.statUnit}>{stat.unit}</ThemedText>
              ) : null}
            </View>
          ))}
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
    gap: 16,
  },
  date: {
    fontSize: 22,
  },
  mapContainer: {
    height: 280,
    borderRadius: 16,
    overflow: 'hidden',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  mapFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  mapHint: {
    fontSize: 14,
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statCard: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 12,
    alignItems: 'center',
    gap: 2,
  },
  statLabel: {
    fontSize: 12,
    opacity: 0.6,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 26,
  },
  statUnit: {
    fontSize: 11,
    opacity: 0.5,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  errorText: {
    color: '#FF3B30',
    textAlign: 'center',
  },
});
