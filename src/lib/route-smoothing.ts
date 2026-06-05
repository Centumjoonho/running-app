import { haversineDistance } from '@/src/lib/geo';

export type SmoothableRoutePoint = {
  latitude: number;
  longitude: number;
  recordedAt: string;
  accuracy?: number | null;
};

const GOOD_ACCURACY_M = 12;
const WEAK_ACCURACY_M = 35;
const CORNER_DISTANCE_M = 14;
const LONG_SEGMENT_DISTANCE_M = 28;
const MIN_ALPHA = 0.45;
const MAX_ALPHA = 0.9;
const MAX_DISPLAY_POINTS = 600;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function getAccuracyAlpha(accuracy: number | null | undefined): number {
  if (accuracy == null || !Number.isFinite(accuracy)) {
    return 0.68;
  }

  if (accuracy <= GOOD_ACCURACY_M) {
    return 0.82;
  }

  if (accuracy >= WEAK_ACCURACY_M) {
    return MIN_ALPHA;
  }

  const ratio = (accuracy - GOOD_ACCURACY_M) / (WEAK_ACCURACY_M - GOOD_ACCURACY_M);
  return clamp(0.82 - ratio * 0.32, MIN_ALPHA, MAX_ALPHA);
}

export function smoothRoutePoint<T extends SmoothableRoutePoint>(
  previousDisplayPoint: T | null,
  nextTrackingPoint: T,
): T {
  if (!previousDisplayPoint) {
    return nextTrackingPoint;
  }

  const distanceM = haversineDistance(previousDisplayPoint, nextTrackingPoint);
  if (distanceM >= LONG_SEGMENT_DISTANCE_M) {
    return nextTrackingPoint;
  }

  const baseAlpha = getAccuracyAlpha(nextTrackingPoint.accuracy);
  const alpha = distanceM >= CORNER_DISTANCE_M ? Math.max(baseAlpha, 0.78) : baseAlpha;

  return {
    ...nextTrackingPoint,
    latitude:
      previousDisplayPoint.latitude * (1 - alpha) + nextTrackingPoint.latitude * alpha,
    longitude:
      previousDisplayPoint.longitude * (1 - alpha) + nextTrackingPoint.longitude * alpha,
  };
}

export function buildDisplayRoute<T extends SmoothableRoutePoint>(trackingPoints: T[]): T[] {
  const result: T[] = [];

  for (const point of trackingPoints) {
    result.push(smoothRoutePoint(result[result.length - 1] ?? null, point));
  }

  if (result.length <= MAX_DISPLAY_POINTS) {
    return result;
  }

  const keepEvery = Math.ceil(result.length / MAX_DISPLAY_POINTS);
  return result.filter((_, index) => index === 0 || index === result.length - 1 || index % keepEvery === 0);
}
