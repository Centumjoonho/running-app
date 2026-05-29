import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Platform, StyleSheet, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GlowingLocationMarker } from '@/components/run/glowing-marker';
import { PlannedCoursePolylines } from '@/components/run/planned-course-polylines';
import { RunMapFallback } from '@/components/run/run-map-fallback';
import { RunMapFloatingStats } from '@/components/run/run-map-overlays';
import { RunRecommendPanel } from '@/components/run/run-recommend-panel';
import { RunRoutePolylines } from '@/components/run/run-route-polylines';
import { ShapeMissionBanner } from '@/components/run/shape-mission-banner';
import { ThemedView } from '@/components/themed-view';
import { borderRadius, colors, darkMapStyle, overlays, runMap, spacing } from '@/src/constants/theme';
import { useAuth } from '@/src/contexts/auth-context';
import { usePlannedCourse } from '@/src/contexts/planned-course-context';
import { useShapeMission } from '@/src/contexts/shape-mission-context';
import { formatDuration, formatPaceSeconds } from '@/src/lib/format';
import { type Coordinate, totalRouteDistanceKm } from '@/src/lib/geo';
import {
  GPS_TRACKING,
  shouldAddPointToRoute,
  shouldUpdateLiveLocation,
  toGpsSample,
} from '@/src/lib/gps-tracking';
import {
  generateRunningRoute,
  isValidRoutePoint,
  validateRunningRoutes,
  type RunningDistanceKm,
  type RunningRoute,
} from '@/src/lib/runningRouteApi';
import { saveRunSession } from '@/src/lib/runs';

type RunPoint = Coordinate & {
  recordedAt: string;
};

type LocationState =
  | { status: 'loading' }
  | { status: 'granted'; latitude: number; longitude: number }
  | { status: 'denied' };

const FIT_MAP_DELAY_MS = 300;
const FIT_MAP_MAX_POINTS = 50;

function filterValidCoordinates(points: Coordinate[] | undefined): Coordinate[] {
  if (!points) {
    return [];
  }

  return points.filter(isValidRoutePoint);
}

function sampleCoordinatesForFit(points: Coordinate[], maxCount = FIT_MAP_MAX_POINTS): Coordinate[] {
  if (points.length <= maxCount) {
    return points;
  }

  const sampled: Coordinate[] = [];

  for (let i = 0; i < maxCount; i += 1) {
    const index = Math.round((i * (points.length - 1)) / (maxCount - 1));
    sampled.push(points[index]);
  }

  return sampled;
}

export default function RunScreen() {
  const { session } = useAuth();
  const router = useRouter();
  const { mission } = useShapeMission();
  const { plannedCourse, setPlannedCourse, clearPlannedCourse } = usePlannedCourse();
  const mapRef = useRef<MapView>(null);
  const requestIdRef = useRef(0);
  const isGeneratingRef = useRef(false);
  const fitMapTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [locationState, setLocationState] = useState<LocationState>({ status: 'loading' });
  const [isRunning, setIsRunning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [routeCoordinates, setRouteCoordinates] = useState<RunPoint[]>([]);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const [selectedDistanceKm, setSelectedDistanceKm] = useState<RunningDistanceKm>(5);
  const [recommendedRoutes, setRecommendedRoutes] = useState<RunningRoute[]>([]);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);
  const [isGeneratingRoutes, setIsGeneratingRoutes] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  const locationSubscription = useRef<Location.LocationSubscription | null>(null);
  const routeCoordinatesRef = useRef<RunPoint[]>([]);
  const startedAtRef = useRef<string>('');

  const selectedRoute = recommendedRoutes[selectedRouteIndex] ?? null;
  const hasValidSelectedRoute = Boolean(
    selectedRoute && filterValidCoordinates(selectedRoute.points).length >= 2,
  );

  const previewCoordinates = useMemo(() => {
    if (isRunning && plannedCourse) {
      return filterValidCoordinates(plannedCourse.coordinates);
    }

    return filterValidCoordinates(selectedRoute?.points);
  }, [isRunning, plannedCourse, selectedRoute]);

  const plannedCourseCoordinates = useMemo(
    () => filterValidCoordinates(plannedCourse?.coordinates),
    [plannedCourse],
  );

  const distanceKm = useMemo(() => totalRouteDistanceKm(routeCoordinates), [routeCoordinates]);

  const fitMapToRoute = useCallback((points: Coordinate[]) => {
    if (Platform.OS === 'web') {
      return;
    }

    const validPoints = filterValidCoordinates(points);
    if (validPoints.length < 2) {
      return;
    }

    if (fitMapTimeoutRef.current) {
      clearTimeout(fitMapTimeoutRef.current);
    }

    fitMapTimeoutRef.current = setTimeout(() => {
      fitMapTimeoutRef.current = null;

      try {
        if (!mapRef.current) {
          return;
        }

        mapRef.current.fitToCoordinates(sampleCoordinatesForFit(validPoints), {
          edgePadding: { top: 48, right: 48, bottom: 180, left: 48 },
          animated: true,
        });
      } catch (error) {
        console.error('[RunScreen] fitToCoordinates error:', error);
      }
    }, FIT_MAP_DELAY_MS);
  }, []);

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
      if (fitMapTimeoutRef.current) {
        clearTimeout(fitMapTimeoutRef.current);
      }
    };
  }, []);

  const handleGenerateRoutes = async () => {
    if (locationState.status !== 'granted' || isGeneratingRef.current) {
      return;
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    const targetDistanceKm = selectedDistanceKm;

    console.log('[RunScreen] generate routes start targetDistanceKm=', targetDistanceKm);

    isGeneratingRef.current = true;
    setIsGeneratingRoutes(true);
    setGenerateError(null);

    try {
      const position = await Location.getCurrentPositionAsync({});
      const center = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };

      if (requestId !== requestIdRef.current) {
        return;
      }

      setLocationState({
        status: 'granted',
        ...center,
      });

      const routes = await generateRunningRoute({
        lat: center.latitude,
        lng: center.longitude,
        targetDistanceKm,
      });

      if (requestId !== requestIdRef.current) {
        console.log('[RunScreen] stale response ignored requestId=', requestId);
        return;
      }

      if (!validateRunningRoutes(routes)) {
        Alert.alert(
          '추천 코스 생성 실패',
          '유효한 코스 데이터를 받지 못했습니다. 잠시 후 다시 시도해주세요.',
        );
        return;
      }

      console.log('[RunScreen] routes count=', routes.length);
      console.log('[RunScreen] selected route distanceKm=', routes[0].distanceKm);

      setRecommendedRoutes(routes);
      setSelectedRouteIndex(0);
      fitMapToRoute(routes[0].points);
    } catch (error) {
      if (requestId !== requestIdRef.current) {
        return;
      }

      console.error('[RunScreen] generate routes error:', error);

      const message =
        error instanceof Error ? error.message : '추천 코스 생성 중 오류가 발생했습니다.';

      setGenerateError(message);
      Alert.alert('추천 코스 생성 실패', message);
    } finally {
      if (requestId === requestIdRef.current) {
        isGeneratingRef.current = false;
        setIsGeneratingRoutes(false);
      }
    }
  };

  const handleSelectRoute = (index: number) => {
    setSelectedRouteIndex(index);
    const route = recommendedRoutes[index];

    if (route && filterValidCoordinates(route.points).length >= 2) {
      console.log('[RunScreen] selected route distanceKm=', route.distanceKm);
      fitMapToRoute(route.points);
    }
  };

  async function handleStartRun() {
    if (locationState.status !== 'granted' || isSaving) return;

    startedAtRef.current = new Date().toISOString();
    setRouteCoordinates([]);
    routeCoordinatesRef.current = [];
    setElapsedSeconds(0);
    setIsRunning(true);

    const startPosition = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });
    const startSample = toGpsSample(startPosition);

    if (!shouldAddPointToRoute(startSample, null)) {
      setIsRunning(false);
      Alert.alert(
        'GPS 신호 대기',
        '위치 정확도가 충분하지 않습니다. 실외 개활지에서 잠시 후 다시 시도해주세요.',
      );
      return;
    }

    const initialCoordinate: RunPoint = {
      latitude: startSample.latitude,
      longitude: startSample.longitude,
      recordedAt: startSample.recordedAt,
    };
    routeCoordinatesRef.current = [initialCoordinate];
    setRouteCoordinates([initialCoordinate]);
    setLocationState({
      status: 'granted',
      latitude: startSample.latitude,
      longitude: startSample.longitude,
    });

    locationSubscription.current?.remove();
    locationSubscription.current = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: GPS_TRACKING.TIME_INTERVAL_MS,
        distanceInterval: GPS_TRACKING.DISTANCE_INTERVAL_M,
      },
      (position) => {
        const sample = toGpsSample(position);

        if (shouldUpdateLiveLocation(sample.accuracy)) {
          setLocationState({
            status: 'granted',
            latitude: sample.latitude,
            longitude: sample.longitude,
          });
        }

        setRouteCoordinates((prev) => {
          const last = prev[prev.length - 1] ?? null;
          const lastSample = last
            ? {
                latitude: last.latitude,
                longitude: last.longitude,
                accuracy: null,
                recordedAt: last.recordedAt,
              }
            : null;

          if (!shouldAddPointToRoute(sample, lastSample)) {
            return prev;
          }

          const coordinate: RunPoint = {
            latitude: sample.latitude,
            longitude: sample.longitude,
            recordedAt: sample.recordedAt,
          };
          const next = [...prev, coordinate];
          routeCoordinatesRef.current = next;
          return next;
        });
      },
    );
  }

  const handleStartWithRoute = () => {
    if (!hasValidSelectedRoute || !selectedRoute || locationState.status !== 'granted') {
      return;
    }

    setPlannedCourse({
      coordinates: filterValidCoordinates(selectedRoute.points),
      estimatedDistanceKm: selectedRoute.distanceKm,
      targetDistanceKm: selectedDistanceKm,
      routeType: selectedRoute.routeType,
      durationMin: selectedRoute.durationMin,
      score: selectedRoute.score,
    });

    handleStartRun();
  };

  const handleStartFreeRun = () => {
    clearPlannedCourse();
    handleStartRun();
  };

  async function handleStopRun() {
    locationSubscription.current?.remove();
    locationSubscription.current = null;
    setIsRunning(false);
    clearPlannedCourse();

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
      router.push({ pathname: '/run-complete', params: { id: result.runId } });
    } else {
      Alert.alert('저장 실패', result.error);
    }
  }

  const canRun = locationState.status === 'granted' && !isSaving && !isGeneratingRoutes;
  const buttonLabel = isSaving ? '저장 중...' : '러닝 종료';
  const stats = [
    { label: '거리', value: distanceKm.toFixed(2), unit: 'km' },
    { label: '시간', value: formatDuration(elapsedSeconds), unit: '' },
    {
      label: '페이스',
      value: formatPaceSeconds(distanceKm > 0 ? elapsedSeconds / distanceKm : null),
      unit: '/km',
    },
  ] as const;

  const showMap = locationState.status === 'granted' && Platform.OS !== 'web';
  const hasCurrentLocation =
    locationState.status === 'granted' &&
    Number.isFinite(locationState.latitude) &&
    Number.isFinite(locationState.longitude);

  return (
    <ThemedView style={styles.screen} darkColor={colors.background} lightColor={colors.background}>
      <SafeAreaView style={styles.content} edges={['top']}>
        {mission ? <ShapeMissionBanner mission={mission} /> : null}
        <View style={styles.mapSection}>
          <View style={styles.mapContainer}>
            {locationState.status === 'loading' ? (
              <RunMapFallback variant="loading" />
            ) : locationState.status === 'denied' ? (
              <RunMapFallback variant="denied" />
            ) : Platform.OS === 'web' ? (
              <RunMapFallback variant="web" />
            ) : (
              <>
                <MapView
                  ref={mapRef}
                  style={styles.map}
                  customMapStyle={darkMapStyle}
                  userInterfaceStyle="dark"
                  showsCompass={false}
                  showsScale={false}
                  showsPointsOfInterest={false}
                  toolbarEnabled={false}
                  initialRegion={{
                    latitude: locationState.latitude,
                    longitude: locationState.longitude,
                    latitudeDelta: runMap.regionDelta,
                    longitudeDelta: runMap.regionDelta,
                  }}>
                  {!isRunning && previewCoordinates.length >= 2 ? (
                    <PlannedCoursePolylines coordinates={previewCoordinates} />
                  ) : null}
                  {isRunning && plannedCourseCoordinates.length >= 2 ? (
                    <PlannedCoursePolylines coordinates={plannedCourseCoordinates} />
                  ) : null}
                  <RunRoutePolylines coordinates={routeCoordinates} />
                  {hasCurrentLocation ? (
                    <Marker
                      coordinate={{
                        latitude: locationState.latitude,
                        longitude: locationState.longitude,
                      }}
                      anchor={{ x: 0.5, y: 0.5 }}
                      tracksViewChanges={false}>
                      <GlowingLocationMarker />
                    </Marker>
                  ) : null}
                </MapView>
                <RunMapFloatingStats stats={stats} isRunning={isRunning} visible={showMap} />
              </>
            )}
          </View>
        </View>

        <RunRecommendPanel
          selectedDistanceKm={selectedDistanceKm}
          onSelectDistance={setSelectedDistanceKm}
          routes={recommendedRoutes}
          selectedRouteIndex={selectedRouteIndex}
          onSelectRoute={handleSelectRoute}
          isGenerating={isGeneratingRoutes}
          generateError={generateError}
          onGenerate={handleGenerateRoutes}
          onStartWithRoute={handleStartWithRoute}
          onStartFreeRun={handleStartFreeRun}
          hasValidSelectedRoute={hasValidSelectedRoute}
          canRun={canRun}
          isRunning={isRunning}
          isSaving={isSaving}
          buttonLabel={buttonLabel}
          onStopRun={handleStopRun}
        />
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
  mapSection: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  mapContainer: {
    flex: 1,
    minHeight: runMap.minHeight,
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
});
