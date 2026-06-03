import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';

import {
  appendBackgroundRunPoints,
  type BackgroundRunPoint,
} from '@/src/lib/background-run-storage';
import { GPS_TRACKING } from '@/src/lib/gps-tracking';

/**
 * 화면이 꺼지거나 앱이 백그라운드 상태일 때도 위치 업데이트를 받기 위한 task.
 * TaskManager.defineTask는 반드시 전역(top-level) 스코프에서 호출해야 하며,
 * 이 파일을 app/_layout.tsx 최상단에서 import 하여 앱 시작 시 등록합니다.
 *
 * 주의: task 내부에서는 React state에 접근하지 않고 AsyncStorage 큐에만 append 합니다.
 * UI 반영은 앱이 foreground로 돌아온 뒤 별도 함수에서 처리합니다.
 */
export const BACKGROUND_LOCATION_TASK = 'myle-background-location';

type LocationTaskData = {
  locations?: Location.LocationObject[];
};

function toBackgroundPoint(location: Location.LocationObject): BackgroundRunPoint | null {
  const { latitude, longitude, accuracy, heading } = location.coords;

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  if (
    accuracy != null &&
    Number.isFinite(accuracy) &&
    accuracy > GPS_TRACKING.MAX_ACCEPTABLE_ACCURACY_M
  ) {
    return null;
  }

  const timestamp =
    typeof location.timestamp === 'number' && Number.isFinite(location.timestamp)
      ? location.timestamp
      : Date.now();

  return {
    latitude,
    longitude,
    timestamp,
    recordedAt: new Date(timestamp).toISOString(),
    heading: heading ?? null,
    accuracy: accuracy ?? null,
  };
}

TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
  if (error) {
    console.warn('[BackgroundTask] task error:', error.message);
    return;
  }

  const { locations } = (data ?? {}) as LocationTaskData;

  if (!locations || locations.length === 0) {
    return;
  }

  const points = locations
    .map(toBackgroundPoint)
    .filter((point): point is BackgroundRunPoint => point !== null);

  if (points.length === 0) {
    console.log('[GPS] invalid point skipped (background)');
    return;
  }

  console.log('[GPS] background location update count=', points.length);
  await appendBackgroundRunPoints(points);
});

console.log('[BackgroundTask] registered');

/** 러닝 시작 시 호출 — 백그라운드/화면 꺼짐 상태에서도 위치 업데이트를 받습니다. */
export async function startBackgroundLocationTracking(): Promise<void> {
  const hasStarted = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK).catch(
    () => false,
  );

  if (hasStarted) {
    return;
  }

  await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
    accuracy: Location.Accuracy.High,
    timeInterval: GPS_TRACKING.TIME_INTERVAL_MS,
    distanceInterval: GPS_TRACKING.DISTANCE_INTERVAL_M,
    pausesUpdatesAutomatically: false,
    activityType: Location.ActivityType.Fitness,
    showsBackgroundLocationIndicator: true,
    foregroundService: {
      notificationTitle: 'Myle 러닝 기록 중',
      notificationBody: '화면이 꺼져도 러닝 경로를 계속 기록하고 있어요.',
      notificationColor: '#35F2A5',
    },
  });

  console.log('[BackgroundTask] started');
}

/** 러닝 종료/정리 시 호출 — 백그라운드 위치 업데이트를 중지합니다. */
export async function stopBackgroundLocationTracking(): Promise<void> {
  try {
    const hasStarted = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);

    if (hasStarted) {
      await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
      console.log('[BackgroundTask] stopped');
    }
  } catch (error) {
    console.warn('[BackgroundTask] stop error:', error);
  }
}
