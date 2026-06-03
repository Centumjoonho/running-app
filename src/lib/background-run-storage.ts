import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * 화면이 꺼졌거나 앱이 백그라운드일 때 background location task가
 * 좌표를 임시로 쌓아두는 로컬 큐입니다.
 * task는 React state에 접근할 수 없으므로 AsyncStorage에만 안전하게 append 합니다.
 */
const POINTS_KEY = '@myle/background-run-points';

export type BackgroundRunPoint = {
  latitude: number;
  longitude: number;
  /** epoch millis. 정렬·거리 계산 기준. */
  timestamp: number;
  recordedAt: string;
  heading: number | null;
  accuracy: number | null;
};

function isValidStoredPoint(value: unknown): value is BackgroundRunPoint {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const point = value as Record<string, unknown>;
  return (
    typeof point.latitude === 'number' &&
    Number.isFinite(point.latitude) &&
    typeof point.longitude === 'number' &&
    Number.isFinite(point.longitude) &&
    typeof point.timestamp === 'number'
  );
}

export async function getBackgroundRunPoints(): Promise<BackgroundRunPoint[]> {
  try {
    const raw = await AsyncStorage.getItem(POINTS_KEY);

    if (!raw) {
      return [];
    }

    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isValidStoredPoint) : [];
  } catch (error) {
    console.warn('[BackgroundTask] failed to read background points:', error);
    return [];
  }
}

export async function appendBackgroundRunPoints(
  points: BackgroundRunPoint[],
): Promise<void> {
  const validPoints = points.filter(isValidStoredPoint);

  if (validPoints.length === 0) {
    return;
  }

  try {
    const existing = await getBackgroundRunPoints();
    const next = [...existing, ...validPoints];
    await AsyncStorage.setItem(POINTS_KEY, JSON.stringify(next));
  } catch (error) {
    console.warn('[BackgroundTask] failed to append background points:', error);
  }
}

export async function clearBackgroundRunPoints(): Promise<void> {
  try {
    await AsyncStorage.removeItem(POINTS_KEY);
  } catch (error) {
    console.warn('[BackgroundTask] failed to clear background points:', error);
  }
}
