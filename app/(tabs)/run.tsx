import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as Location from 'expo-location';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, StyleSheet, View } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/src/contexts/auth-context';
import { type Coordinate, haversineDistance, totalRouteDistanceKm } from '@/src/lib/geo';
import { saveRunSession } from '@/src/lib/runs';

type RunPoint = Coordinate & {
  recordedAt: string;
};

type LocationState =
  | { status: 'loading' }
  | { status: 'granted'; latitude: number; longitude: number }
  | { status: 'denied' };

const MAP_DELTA = 0.01;
const MIN_POINT_DISTANCE_M = 1;

function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function formatPace(totalSeconds: number, distanceKm: number): string {
  if (distanceKm <= 0) {
    return '--';
  }

  const paceSeconds = totalSeconds / distanceKm;
  const minutes = Math.floor(paceSeconds / 60);
  const seconds = Math.floor(paceSeconds % 60);

  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function LocationDeniedMessage({ iconColor }: { iconColor: string }) {
  return (
    <>
      <MaterialIcons name="location-off" size={48} color={iconColor} />
      <ThemedText style={[styles.deniedTitle, { color: iconColor }]}>
        위치 권한이 필요합니다
      </ThemedText>
      <ThemedText style={[styles.deniedMessage, { color: iconColor }]}>
        러닝 기록을 위해 기기 설정에서 위치 권한을 허용해 주세요.
      </ThemedText>
    </>
  );
}

export default function RunScreen() {
  const { session } = useAuth();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const mapBackground = colorScheme === 'dark' ? '#2C2C2E' : '#E8E8ED';
  const mapIconColor = colorScheme === 'dark' ? '#636366' : '#AEAEB2';
  const cardBackground = colorScheme === 'dark' ? '#1C1C1E' : '#F2F2F7';

  const [locationState, setLocationState] = useState<LocationState>({ status: 'loading' });
  const [isRunning, setIsRunning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [routeCoordinates, setRouteCoordinates] = useState<RunPoint[]>([]);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const locationSubscription = useRef<Location.LocationSubscription | null>(null);
  const routeCoordinatesRef = useRef<RunPoint[]>([]);
  const startedAtRef = useRef<string>('');

  const distanceKm = useMemo(() => totalRouteDistanceKm(routeCoordinates), [routeCoordinates]);

  useEffect(() => {
    let isMounted = true;

    async function requestLocation() {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (!isMounted) return;

      if (status !== 'granted') {
        setLocationState({ status: 'denied' });
        return;
      }

      try {
        const position = await Location.getCurrentPositionAsync({});
        if (!isMounted) return;

        setLocationState({
          status: 'granted',
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      } catch {
        if (isMounted) {
          setLocationState({ status: 'denied' });
        }
      }
    }

    requestLocation();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning]);

  useEffect(() => {
    return () => {
      locationSubscription.current?.remove();
    };
  }, []);

  async function handleStartRun() {
    if (locationState.status !== 'granted' || isSaving) return;

    startedAtRef.current = new Date().toISOString();
    setRouteCoordinates([]);
    routeCoordinatesRef.current = [];
    setElapsedSeconds(0);
    setIsRunning(true);

    const initialCoordinate: RunPoint = {
      latitude: locationState.latitude,
      longitude: locationState.longitude,
      recordedAt: startedAtRef.current,
    };
    routeCoordinatesRef.current = [initialCoordinate];
    setRouteCoordinates([initialCoordinate]);

    locationSubscription.current?.remove();
    locationSubscription.current = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: 1000,
        distanceInterval: 1,
      },
      (position) => {
        const coordinate: RunPoint = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          recordedAt: new Date(position.timestamp).toISOString(),
        };

        setLocationState({
          status: 'granted',
          latitude: coordinate.latitude,
          longitude: coordinate.longitude,
        });

        setRouteCoordinates((prev) => {
          const last = prev[prev.length - 1];
          if (
            last &&
            haversineDistance(last, coordinate) < MIN_POINT_DISTANCE_M
          ) {
            return prev;
          }

          const next = [...prev, coordinate];
          routeCoordinatesRef.current = next;
          return next;
        });
      }
    );
  }

  async function handleStopRun() {
    locationSubscription.current?.remove();
    locationSubscription.current = null;
    setIsRunning(false);

    const userId = session?.user?.id;
    if (!userId) {
      Alert.alert('저장 실패', '로그인 정보를 찾을 수 없습니다.');
      return;
    }

    setIsSaving(true);

    const endedAt = new Date().toISOString();
    const points = routeCoordinatesRef.current;
    const distanceM = totalRouteDistanceKm(points) * 1000;
    const avgPaceSecondsPerKm = distanceM > 0 ? elapsedSeconds / (distanceM / 1000) : null;

    const result = await saveRunSession({
      userId,
      startedAt: startedAtRef.current,
      endedAt,
      distanceM,
      durationSeconds: elapsedSeconds,
      avgPaceSecondsPerKm,
      points: points.map(({ latitude, longitude, recordedAt }) => ({
        latitude,
        longitude,
        recordedAt,
      })),
    });

    setIsSaving(false);

    if (result.ok) {
      Alert.alert('저장 완료', '러닝 기록이 저장되었습니다.');
    } else {
      Alert.alert('저장 실패', result.error);
    }
  }

  const canRun = locationState.status === 'granted' && !isSaving;
  const buttonLabel = isSaving ? '저장 중...' : isRunning ? '러닝 종료' : '러닝 시작';
  const stats = [
    { label: '거리', value: distanceKm.toFixed(2), unit: 'km' },
    { label: '시간', value: formatDuration(elapsedSeconds), unit: '' },
    { label: '페이스', value: formatPace(elapsedSeconds, distanceKm), unit: '/km' },
  ] as const;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.content}>
        <ThemedText type="title" style={styles.title}>
          {isRunning ? '러닝 중' : '러닝 시작'}
        </ThemedText>

        <View style={[styles.mapContainer, { backgroundColor: mapBackground }]}>
          {locationState.status === 'loading' ? (
            <View style={styles.mapFallback}>
              <ActivityIndicator size="large" color={theme.tint} />
              <ThemedText style={[styles.mapHint, { color: mapIconColor }]}>
                위치 정보를 가져오는 중...
              </ThemedText>
            </View>
          ) : locationState.status === 'denied' ? (
            <View style={styles.mapFallback}>
              <LocationDeniedMessage iconColor={mapIconColor} />
            </View>
          ) : Platform.OS === 'web' ? (
            <View style={styles.mapFallback}>
              <MaterialIcons name="map" size={48} color={mapIconColor} />
              <ThemedText style={[styles.mapHint, { color: mapIconColor }]}>
                지도는 iOS/Android 앱에서 사용할 수 있습니다
              </ThemedText>
            </View>
          ) : (
            <MapView
              style={styles.map}
              initialRegion={{
                latitude: locationState.latitude,
                longitude: locationState.longitude,
                latitudeDelta: MAP_DELTA,
                longitudeDelta: MAP_DELTA,
              }}>
              {routeCoordinates.length >= 2 ? (
                <Polyline
                  coordinates={routeCoordinates}
                  strokeColor={theme.tint}
                  strokeWidth={4}
                />
              ) : null}
              <Marker
                coordinate={{
                  latitude: locationState.latitude,
                  longitude: locationState.longitude,
                }}
                title="현재 위치"
              />
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

        <Pressable
          disabled={!canRun && !isRunning}
          onPress={isRunning ? handleStopRun : handleStartRun}
          style={({ pressed }) => [
            styles.startButton,
            {
              backgroundColor: isRunning ? '#FF3B30' : theme.tint,
              opacity: !canRun && !isRunning ? 0.4 : isSaving ? 0.6 : pressed ? 0.85 : 1,
            },
          ]}>
          {isSaving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <ThemedText style={styles.startButtonText} lightColor="#fff" darkColor="#151718">
              {buttonLabel}
            </ThemedText>
          )}
        </Pressable>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 16,
  },
  title: {
    fontSize: 28,
    marginTop: 8,
  },
  mapContainer: {
    flex: 1,
    minHeight: 240,
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
    gap: 8,
    paddingHorizontal: 24,
  },
  mapHint: {
    fontSize: 14,
  },
  deniedTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 4,
  },
  deniedMessage: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
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
  startButton: {
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startButtonText: {
    fontSize: 17,
    fontWeight: '600',
  },
});
