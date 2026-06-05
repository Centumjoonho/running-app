import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, AppState, Linking, Platform, Pressable, StyleSheet, View } from 'react-native';
import MapView from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CurrentLocationMarker } from '@/components/map/current-location-marker';
import { PlannedCoursePolylines } from '@/components/run/planned-course-polylines';
import { RunMapFallback } from '@/components/run/run-map-fallback';
import { RunMapFloatingStats } from '@/components/run/run-map-overlays';
import { RunRecommendPanel } from '@/components/run/run-recommend-panel';
import { RunRoutePolylines } from '@/components/run/run-route-polylines';
import { RunStartTransition } from '@/components/run/run-start-transition';
import { ShapeMissionBanner } from '@/components/run/shape-mission-banner';
import { ThemedView } from '@/components/themed-view';
import { borderRadius, colors, darkMapStyle, overlays, runMap, spacing } from '@/src/constants/theme';
import { useAuth } from '@/src/contexts/auth-context';
import { usePlannedCourse } from '@/src/contexts/planned-course-context';
import { useShapeMission } from '@/src/contexts/shape-mission-context';
import {
    clearBackgroundRunPoints,
    getBackgroundRunPoints,
} from '@/src/lib/background-run-storage';
import { formatDuration, formatPaceSeconds } from '@/src/lib/format';
import { totalRouteDistanceKm, type Coordinate } from '@/src/lib/geo';
import {
    buildCleanRoute,
    getGpsSampleRejectReason,
    GPS_TRACKING,
    normalizeCoordinate,
    shouldUpdateLiveLocation,
    smoothHeading,
    toGpsSample,
    type GpsSample,
} from '@/src/lib/gps-tracking';
import { buildDisplayRoute, smoothRoutePoint } from '@/src/lib/route-smoothing';
import { OFFLINE_SAVE_MESSAGE, saveRunWithLocalFallback } from '@/src/lib/run-sync';
import { MIN_SAVE_DISTANCE_KM } from '@/src/lib/runs';
import {
    generateRunningRoute,
    validateRunningRoutes,
    type RunningDistanceKm,
    type RunningRoute,
} from '@/src/lib/runningRouteApi';
import {
    startBackgroundLocationTracking,
    stopBackgroundLocationTracking,
} from '@/src/tasks/background-location-task';

type RunPoint = Coordinate & {
  recordedAt: string;
  timestamp: number;
  accuracy: number | null;
  speed: number | null;
  heading: number | null;
};

type LocationState =
  | { status: 'loading' }
  | { status: 'granted'; latitude: number; longitude: number }
  | { status: 'denied' };

/** idle: 대기 / preparing: GPS 준비 / countdown: 카운트다운 / running: 기록 중 / paused: 일시정지 / finishing: 저장 중 */
type RunStatus = 'idle' | 'preparing' | 'countdown' | 'running' | 'paused' | 'finishing';

const FIT_MAP_DELAY_MS = 300;
const FIT_MAP_MAX_POINTS = 50;
const COUNTDOWN_INTERVAL_MS = 1000;
const CAMERA_FOLLOW_THROTTLE_MS = 1500;
const LOCATION_REQUIRED_MESSAGE = '현재 위치를 확인할 수 없습니다. GPS가 켜져 있는지 확인해주세요.';

function filterValidCoordinates(points: Coordinate[] | undefined): Coordinate[] {
  if (!points) {
    return [];
  }

  return points
    .map((point) => normalizeCoordinate(point))
    .filter((point): point is Coordinate => point !== null);
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
  const countdownTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startFlashTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const finalizeRunStartRef = useRef<(() => void) | null>(null);
  const lastPositionRef = useRef<Coordinate | null>(null);

  const [locationState, setLocationState] = useState<LocationState>({ status: 'loading' });
  const [runStatus, setRunStatus] = useState<RunStatus>('idle');
  const [countdown, setCountdown] = useState(0);
  const [countdownLabel, setCountdownLabel] = useState<string | null>(null);
  const [showStartFlash, setShowStartFlash] = useState(false);
  const [trackingPoints, setTrackingPoints] = useState<RunPoint[]>([]);
  const [displayPoints, setDisplayPoints] = useState<RunPoint[]>([]);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [currentHeading, setCurrentHeading] = useState<number | null>(null);
  const [followUser, setFollowUser] = useState(true);

  const [selectedDistanceKm, setSelectedDistanceKm] = useState<RunningDistanceKm>(5);
  const [recommendedRoutes, setRecommendedRoutes] = useState<RunningRoute[]>([]);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);
  const [isGeneratingRoutes, setIsGeneratingRoutes] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  const locationSubscription = useRef<Location.LocationSubscription | null>(null);
  const rawPointsRef = useRef<RunPoint[]>([]);
  const trackingPointsRef = useRef<RunPoint[]>([]);
  const displayPointsRef = useRef<RunPoint[]>([]);
  const startedAtRef = useRef<string>('');
  const runStatusRef = useRef<RunStatus>('idle');
  const runStartTimeRef = useRef<number>(0);
  const pendingStartSampleRef = useRef<GpsSample | null>(null);
  const latestValidSampleRef = useRef<GpsSample | null>(null);
  const currentHeadingRef = useRef<number | null>(null);
  const followUserRef = useRef(true);
  const lastCameraMoveRef = useRef(0);

  const isRunning = runStatus === 'running';
  const isPreparing = runStatus === 'preparing';
  const isCountingDown = runStatus === 'countdown';
  const isSaving = runStatus === 'finishing';

  const setRunStatusSafe = useCallback((next: RunStatus) => {
    runStatusRef.current = next;
    setRunStatus(next);
  }, []);

  const setFollowUserSafe = useCallback((next: boolean) => {
    followUserRef.current = next;
    setFollowUser(next);
  }, []);

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

  const distanceKm = useMemo(() => totalRouteDistanceKm(trackingPoints), [trackingPoints]);

  const fitMapToRoute = useCallback((points: Coordinate[], statsVisible = false) => {
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
          edgePadding: statsVisible
            ? { top: 48, right: 48, bottom: 180, left: 48 }
            : { top: 16, right: 48, bottom: 180, left: 48 },
          animated: true,
        });
      } catch (error) {
        console.error('[RunScreen] fitToCoordinates error:', error);
      }
    }, FIT_MAP_DELAY_MS);
  }, []);

  const focusMapOnRunStart = useCallback((coordinate: Coordinate) => {
    if (Platform.OS === 'web') {
      return;
    }

    if (!Number.isFinite(coordinate.latitude) || !Number.isFinite(coordinate.longitude)) {
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

        mapRef.current.animateCamera(
          {
            center: {
              latitude: coordinate.latitude,
              longitude: coordinate.longitude,
            },
            zoom: runMap.runningCameraZoom,
          },
          { duration: 600 },
        );
      } catch (error) {
        console.error('[RunScreen] animateCamera error:', error);
      }
    }, FIT_MAP_DELAY_MS);
  }, []);

  const logGpsDebug = useCallback((message: string, payload?: unknown) => {
    if (!__DEV__) {
      return;
    }

    if (payload === undefined) {
      console.log(message);
      return;
    }

    console.log(message, payload);
  }, []);

  const toRunPoint = useCallback((sample: GpsSample, recordedAt = sample.recordedAt): RunPoint => {
    const timestamp = new Date(recordedAt).getTime();

    return {
      latitude: sample.latitude,
      longitude: sample.longitude,
      recordedAt,
      timestamp: Number.isFinite(timestamp) ? timestamp : sample.timestamp,
      accuracy: sample.accuracy,
      speed: sample.speed,
      heading: sample.heading,
    };
  }, []);

  const resetRunPoints = useCallback(() => {
    rawPointsRef.current = [];
    trackingPointsRef.current = [];
    displayPointsRef.current = [];
    setTrackingPoints([]);
    setDisplayPoints([]);
  }, []);

  const appendTrackingSample = useCallback(
    (sample: GpsSample, recordedAt = sample.recordedAt): boolean => {
      const point = toRunPoint(sample, recordedAt);
      rawPointsRef.current = [...rawPointsRef.current, point];
      logGpsDebug('[GPS] raw point received', {
        accuracy: sample.accuracy,
        speed: sample.speed,
      });

      const lastTrackingPoint =
        trackingPointsRef.current[trackingPointsRef.current.length - 1] ?? null;
      const lastSample: GpsSample | null = lastTrackingPoint
        ? {
            latitude: lastTrackingPoint.latitude,
            longitude: lastTrackingPoint.longitude,
            recordedAt: lastTrackingPoint.recordedAt,
            timestamp: lastTrackingPoint.timestamp,
            accuracy: lastTrackingPoint.accuracy,
            speed: lastTrackingPoint.speed,
            heading: lastTrackingPoint.heading,
          }
        : null;
      const rejectReason = getGpsSampleRejectReason(sample, lastSample);

      if (rejectReason) {
        logGpsDebug(`[GPS] point rejected: ${rejectReason}`);
        return false;
      }

      const nextTrackingPoints = [...trackingPointsRef.current, point];
      const previousDisplayPoint =
        displayPointsRef.current[displayPointsRef.current.length - 1] ?? null;
      const nextDisplayPoint = smoothRoutePoint(previousDisplayPoint, point);
      const nextDisplayPoints = [...displayPointsRef.current, nextDisplayPoint];

      trackingPointsRef.current = nextTrackingPoints;
      displayPointsRef.current = nextDisplayPoints;
      setTrackingPoints(nextTrackingPoints);
      setDisplayPoints(nextDisplayPoints);
      logGpsDebug('[GPS] tracking point accepted', nextTrackingPoints.length);
      logGpsDebug('[GPS] display point smoothed', nextDisplayPoint);
      return true;
    },
    [logGpsDebug, toRunPoint],
  );

  // 러닝 중 마커 이동에 맞춰 카메라를 따라가게 합니다. (followUser=true일 때만, throttle 적용)
  const followCameraToUser = useCallback((coordinate: Coordinate) => {
    if (Platform.OS === 'web' || !followUserRef.current) {
      return;
    }

    if (runStatusRef.current !== 'running') {
      return;
    }

    if (!Number.isFinite(coordinate.latitude) || !Number.isFinite(coordinate.longitude)) {
      return;
    }

    const now = Date.now();
    if (now - lastCameraMoveRef.current < CAMERA_FOLLOW_THROTTLE_MS) {
      return;
    }
    lastCameraMoveRef.current = now;

    try {
      mapRef.current?.animateCamera(
        {
          center: { latitude: coordinate.latitude, longitude: coordinate.longitude },
          zoom: runMap.runningCameraZoom,
        },
        { duration: 800 },
      );
      console.log('[MapFollow] camera moved to user');
    } catch (error) {
      console.error('[RunScreen] follow animateCamera error:', error);
    }
  }, []);

  // foreground watch 콜백 — countdown/running 공통. 마커·heading은 항상 갱신, 경로 기록은 running일 때만.
  const handleForegroundSample = useCallback(
    (sample: GpsSample) => {
      if (!shouldUpdateLiveLocation(sample.accuracy)) {
        logGpsDebug('[GPS] point rejected: poor accuracy');
        return;
      }

      const coordinate: Coordinate = {
        latitude: sample.latitude,
        longitude: sample.longitude,
      };

      const nextHeading = smoothHeading(
        currentHeadingRef.current,
        sample.heading,
        lastPositionRef.current,
        coordinate,
      );

      if (nextHeading !== currentHeadingRef.current) {
        currentHeadingRef.current = nextHeading;
        setCurrentHeading(nextHeading);
        console.log('[Heading] heading updated', nextHeading?.toFixed(0));
      }

      lastPositionRef.current = coordinate;
      latestValidSampleRef.current = sample;
      setLocationState({ status: 'granted', ...coordinate });
      followCameraToUser(coordinate);

      if (runStatusRef.current !== 'running') {
        return;
      }

      const sampleTime = new Date(sample.recordedAt).getTime();
      if (sampleTime < runStartTimeRef.current) {
        return;
      }

      appendTrackingSample(sample);
    },
    [appendTrackingSample, followCameraToUser, logGpsDebug],
  );

  const startForegroundWatch = useCallback(async () => {
    locationSubscription.current?.remove();
    locationSubscription.current = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: GPS_TRACKING.TIME_INTERVAL_MS,
        distanceInterval: GPS_TRACKING.DISTANCE_INTERVAL_M,
      },
      (position) => handleForegroundSample(toGpsSample(position)),
    );
  }, [handleForegroundSample]);

  // 백그라운드에 쌓인 좌표를 현재 경로에 병합합니다. (시작 시각 이후 + 정렬 + 중복/이상치 제거)
  const mergeBackgroundPoints = useCallback(async () => {
    const startTime = runStartTimeRef.current;
    if (startTime <= 0) {
      return;
    }

    const backgroundPoints = await getBackgroundRunPoints();
    if (backgroundPoints.length === 0) {
      return;
    }

    const startTimeIso = new Date(startTime).toISOString();
    const merged = buildCleanRoute<RunPoint>([
      ...trackingPointsRef.current,
      ...backgroundPoints
        .filter((point) => point.timestamp >= startTime)
        .map((point) => ({
          latitude: point.latitude,
          longitude: point.longitude,
          recordedAt: point.recordedAt ?? startTimeIso,
          timestamp: point.timestamp,
          accuracy: point.accuracy,
          speed: null,
          heading: point.heading,
        })),
    ]);

    trackingPointsRef.current = merged;
    displayPointsRef.current = buildDisplayRoute(merged);
    setTrackingPoints(merged);
    setDisplayPoints(displayPointsRef.current);
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function requestLocation() {
      const { status } = await Location.requestForegroundPermissionsAsync();
      console.log('[Perm] foreground:', status);

      if (!isMounted) return;

      if (status !== 'granted') {
        setLocationState({ status: 'denied' });
        return;
      }

      try {
        const position = await Location.getCurrentPositionAsync({});
        if (!isMounted) return;

        const sample = toGpsSample(position);
        lastPositionRef.current = {
          latitude: sample.latitude,
          longitude: sample.longitude,
        };
        setLocationState({
          status: 'granted',
          latitude: sample.latitude,
          longitude: sample.longitude,
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

  // idle 상태에서만 동작하는 프리뷰 watch (현재 위치 마커 표시용).
  useEffect(() => {
    if (locationState.status !== 'granted' || runStatus !== 'idle') {
      return;
    }

    let isMounted = true;
    let previewSubscription: Location.LocationSubscription | null = null;

    Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.Balanced,
        distanceInterval: 10,
      },
      (position) => {
        if (!isMounted) {
          return;
        }

        const sample = toGpsSample(position);

        if (!shouldUpdateLiveLocation(sample.accuracy)) {
          return;
        }

        lastPositionRef.current = {
          latitude: sample.latitude,
          longitude: sample.longitude,
        };
        setLocationState({
          status: 'granted',
          latitude: sample.latitude,
          longitude: sample.longitude,
        });
      },
    ).then((subscription) => {
      if (!isMounted) {
        subscription.remove();
        return;
      }

      previewSubscription = subscription;
    });

    return () => {
      isMounted = false;
      previewSubscription?.remove();
    };
  }, [runStatus, locationState.status]);

  // 경과 시간은 running 상태에서만 증가합니다. (paused/finishing 제외)
  useEffect(() => {
    if (runStatus !== 'running') return;

    const interval = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [runStatus]);

  // 앱이 foreground로 복귀하면 백그라운드에서 쌓인 좌표를 경로에 병합합니다.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active' && runStatusRef.current === 'running') {
        void mergeBackgroundPoints();
        if (lastPositionRef.current) {
          followCameraToUser(lastPositionRef.current);
        }
      }
    });

    return () => subscription.remove();
  }, [followCameraToUser, mergeBackgroundPoints]);

  useEffect(() => {
    return () => {
      locationSubscription.current?.remove();
      if (fitMapTimeoutRef.current) {
        clearTimeout(fitMapTimeoutRef.current);
      }
      if (countdownTimeoutRef.current) {
        clearTimeout(countdownTimeoutRef.current);
      }
      if (startFlashTimeoutRef.current) {
        clearTimeout(startFlashTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!isCountingDown || countdown <= 0) {
      return;
    }

    setCountdownLabel(String(countdown));

    countdownTimeoutRef.current = setTimeout(() => {
      countdownTimeoutRef.current = null;

      if (countdown <= 1) {
        setCountdownLabel('START');
        setShowStartFlash(true);
        setCountdown(0);
        finalizeRunStartRef.current?.();
        startFlashTimeoutRef.current = setTimeout(() => {
          setShowStartFlash(false);
          setCountdownLabel(null);
          startFlashTimeoutRef.current = null;
        }, 420);
        return;
      }

      setCountdown((prev) => prev - 1);
    }, COUNTDOWN_INTERVAL_MS);

    return () => {
      if (countdownTimeoutRef.current) {
        clearTimeout(countdownTimeoutRef.current);
        countdownTimeoutRef.current = null;
      }
    };
  }, [isCountingDown, countdown]);

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

  const currentLocation = useMemo((): Coordinate | null => {
    if (locationState.status !== 'granted') {
      return null;
    }

    const { latitude, longitude } = locationState;

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return null;
    }

    return { latitude, longitude };
  }, [locationState]);

  // 백그라운드(화면 꺼짐) 추적 권한 확인 후 task 시작. 실패해도 foreground 러닝은 계속됩니다.
  const ensureBackgroundTracking = useCallback(async () => {
    if (Platform.OS === 'web') {
      return;
    }

    try {
      let background = await Location.getBackgroundPermissionsAsync();

      if (background.status !== 'granted') {
        background = await Location.requestBackgroundPermissionsAsync();
      }

      console.log('[Perm] background:', background.status);

      if (background.status !== 'granted') {
        Alert.alert(
          '백그라운드 위치 권한 필요',
          '화면이 꺼진 동안에도 러닝을 기록하려면 위치 권한을 "항상 허용"으로 설정해주세요. 권한 없이도 화면이 켜져 있는 동안에는 기록됩니다.',
          [
            { text: '설정 열기', onPress: () => Linking.openSettings().catch(() => undefined) },
            { text: '계속', style: 'cancel' },
          ],
        );
        return;
      }

      await clearBackgroundRunPoints();
      await startBackgroundLocationTracking();
    } catch (error) {
      console.warn('[BackgroundTask] start failed:', error);
    }
  }, []);

  // 카운트다운 종료 시점에 호출 — 실제 기록 시작.
  const finalizeRunStart = useCallback(() => {
    const startSample = latestValidSampleRef.current ?? pendingStartSampleRef.current;
    const firstCoordinate = startSample
      ? { latitude: startSample.latitude, longitude: startSample.longitude }
      : lastPositionRef.current;

    if (!firstCoordinate || !Number.isFinite(firstCoordinate.latitude)) {
      Alert.alert('GPS 신호 확인 불가', LOCATION_REQUIRED_MESSAGE);
      void stopBackgroundLocationTracking();
      locationSubscription.current?.remove();
      locationSubscription.current = null;
      setRunStatusSafe('idle');
      return;
    }

    const startTime = Date.now();
    runStartTimeRef.current = startTime;
    startedAtRef.current = new Date(startTime).toISOString();

    resetRunPoints();
    if (startSample) {
      appendTrackingSample(
        {
          ...startSample,
          recordedAt: startedAtRef.current,
          timestamp: startTime,
        },
        startedAtRef.current,
      );
    }
    setElapsedSeconds(0);
    lastCameraMoveRef.current = 0;

    setRunStatusSafe('running');
    console.log('[Countdown] finished');

    focusMapOnRunStart(firstCoordinate);
  }, [appendTrackingSample, focusMapOnRunStart, resetRunPoints, setRunStatusSafe]);

  finalizeRunStartRef.current = finalizeRunStart;

  // 러닝 시작 버튼 진입점: 권한 확인 → 현재 위치 즉시 확보 → watch/백그라운드 준비 → 카운트다운.
  const startCountdown = useCallback(async () => {
    if (runStatusRef.current !== 'idle') {
      return;
    }

    console.log('[RunStart] start button pressed');
    setRunStatusSafe('preparing');
    setCountdown(0);
    setCountdownLabel(null);
    setShowStartFlash(false);
    resetRunPoints();
    pendingStartSampleRef.current = null;
    latestValidSampleRef.current = null;

    let startCoordinate: Coordinate | null = null;
    try {
      const foreground = await Location.requestForegroundPermissionsAsync();
      if (foreground.status !== 'granted') {
        setRunStatusSafe('idle');
        setLocationState({ status: 'denied' });
        Alert.alert('위치 권한 필요', LOCATION_REQUIRED_MESSAGE);
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      const sample = toGpsSample(position);
      if (!shouldUpdateLiveLocation(sample.accuracy)) {
        setRunStatusSafe('idle');
        Alert.alert('GPS 신호 확인 중', '현재 GPS 정확도가 낮습니다. 하늘이 잘 보이는 곳에서 다시 시도해주세요.');
        return;
      }

      pendingStartSampleRef.current = sample;
      latestValidSampleRef.current = sample;
      startCoordinate = { latitude: sample.latitude, longitude: sample.longitude };
      lastPositionRef.current = startCoordinate;
      setLocationState({ status: 'granted', ...startCoordinate });
      console.log('[RunStart] current location prepared');
    } catch {
      setRunStatusSafe('idle');
      Alert.alert('현재 위치 확인 중', '현재 위치를 확인 중입니다. 잠시 후 다시 시도해주세요.');
      return;
    }

    setFollowUserSafe(true);
    setCurrentHeading(null);
    currentHeadingRef.current = null;

    try {
      await startForegroundWatch();
    } catch (error) {
      console.warn('[GPS] foreground watch start failed:', error);
    }

    void ensureBackgroundTracking();

    if (startCoordinate) {
      focusMapOnRunStart(startCoordinate);
    }

    setRunStatusSafe('countdown');
    setCountdown(3);
    console.log('[Countdown] started');
  }, [
    ensureBackgroundTracking,
    focusMapOnRunStart,
    resetRunPoints,
    setFollowUserSafe,
    setRunStatusSafe,
    startForegroundWatch,
  ]);

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

    void startCountdown();
  };

  const handleStartFreeRun = () => {
    clearPlannedCourse();
    void startCountdown();
  };

  const handleRecenter = useCallback(() => {
    setFollowUserSafe(true);
    if (lastPositionRef.current) {
      lastCameraMoveRef.current = 0;
      followCameraToUser(lastPositionRef.current);
    }
  }, [followCameraToUser, setFollowUserSafe]);

  async function handleStopRun() {
    if (runStatusRef.current === 'finishing' || runStatusRef.current === 'idle') {
      return;
    }

    setRunStatusSafe('finishing');

    locationSubscription.current?.remove();
    locationSubscription.current = null;
    await stopBackgroundLocationTracking();
    await mergeBackgroundPoints();
    await clearBackgroundRunPoints();

    clearPlannedCourse();

    const points = buildCleanRoute<RunPoint>(trackingPointsRef.current);
    trackingPointsRef.current = points;
    displayPointsRef.current = buildDisplayRoute(points);
    setTrackingPoints(points);
    setDisplayPoints(displayPointsRef.current);
    const totalDistanceKm = totalRouteDistanceKm(points);

    if (totalDistanceKm <= MIN_SAVE_DISTANCE_KM) {
      resetRunPoints();
      setElapsedSeconds(0);
      runStartTimeRef.current = 0;
      setRunStatusSafe('idle');
      Alert.alert('기록 저장 안 됨', '50m 이하의 짧은 러닝은 기록으로 저장되지 않습니다.');
      return;
    }

    const userId = session?.user?.id;
    if (!userId) {
      setRunStatusSafe('idle');
      Alert.alert('저장 실패', '로그인 정보를 찾을 수 없습니다.');
      return;
    }

    const endedAt = new Date().toISOString();
    const distanceM = totalDistanceKm * 1000;
    const avgPaceSecondsPerKm = distanceM > 0 ? elapsedSeconds / (distanceM / 1000) : null;

    console.log('[RunFinish] points count', points.length);

    const result = await saveRunWithLocalFallback({
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

    runStartTimeRef.current = 0;
    setRunStatusSafe('idle');

    if (result.ok && result.synced) {
      console.log('[RunFinish] saved successfully');
      router.push({ pathname: '/run-complete', params: { id: result.runId } });
    } else if (result.ok && !result.synced) {
      console.log('[RunFinish] saved locally due to network error');
      Alert.alert('임시 저장됨', OFFLINE_SAVE_MESSAGE);
    } else {
      Alert.alert('저장 실패', result.error);
    }
  }

  const canRun =
    locationState.status === 'granted' &&
    runStatus === 'idle' &&
    !isSaving &&
    !isGeneratingRoutes;
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
  const showStatsPanel = showMap && isRunning;

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
                  onPanDrag={() => {
                    if (runStatusRef.current === 'running' && followUserRef.current) {
                      setFollowUserSafe(false);
                    }
                  }}
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
                  <RunRoutePolylines coordinates={displayPoints} />
                  {currentLocation ? (
                    <CurrentLocationMarker
                      coordinate={currentLocation}
                      heading={currentHeading}
                      active={isPreparing || isCountingDown || isRunning}
                    />
                  ) : null}
                </MapView>
                <RunStartTransition
                  visible={isPreparing || isCountingDown || showStartFlash}
                  preparing={isPreparing}
                  label={countdownLabel}
                />
                <RunMapFloatingStats stats={stats} isRunning={isRunning} visible={showStatsPanel} />
                {isRunning ? (
                  <Pressable
                    onPress={handleRecenter}
                    style={[styles.recenterButton, followUser && styles.recenterButtonActive]}
                    hitSlop={8}>
                    <Ionicons
                      name="locate"
                      size={22}
                      color={followUser ? colors.background : colors.secondary}
                    />
                  </Pressable>
                ) : null}
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
          isCountingDown={isCountingDown}
          isRunning={isRunning}
          isSaving={isSaving}
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
  recenterButton: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg,
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: overlays.card,
    borderWidth: 1,
    borderColor: overlays.secondaryGlow,
  },
  recenterButtonActive: {
    backgroundColor: colors.secondary,
    borderColor: colors.secondary,
  },
});
