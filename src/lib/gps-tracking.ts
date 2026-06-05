import { type Coordinate, bearingBetween, haversineDistance } from '@/src/lib/geo';

/**
 * 실외 러닝 GPS 기록 품질 기준.
 * OS·기기·환경(고층 건물, 터널 입구)마다 오차가 크므로
 * 저장 전 필터링으로 경로·거리 왜곡을 줄입니다.
 */
export const GPS_TRACKING = {
  /**
   * 위치 콜백 최소 간격(ms).
   * 너무 짧으면 정지 중에도 미세 좌표가 쏟아져 경로가 지터링합니다.
   */
  TIME_INTERVAL_MS: 2000,

  /**
   * OS에 요청하는 최소 이동 거리(m).
   * watchPositionAsync가 불필요한 업데이트를 덜 보내도록 합니다.
   */
  DISTANCE_INTERVAL_M: 3,

  /**
   * 직전 포인트와의 거리(m)가 이보다 작으면 중복으로 간주합니다.
   * GPS 정지 상태 드리프트(1~2m 흔들림)를 경로에 쌓지 않습니다.
   */
  MIN_POINT_DISTANCE_M: 3,

  /**
   * coords.accuracy(m) 상한. 이보다 부정확한 좌표는 신뢰하지 않습니다.
   * 실외에서도 초기 fix·건물 반사 시 30m 이상 오차가 날 수 있습니다.
   */
  MAX_ACCEPTABLE_ACCURACY_M: 35,

  /**
   * 단일 업데이트에서 허용하는 최대 이동 거리(m).
   * 순간 점프(“텔레포트”)는 GPS 글리치로 보고 경로에서 제외합니다.
   */
  MAX_SEGMENT_DISTANCE_M: 100,

  /**
   * 두 포인트 사이 최대 허용 속도(m/s). 약 54km/h.
   * 육상 러닝보다 훨씬 빠른 구간은 비현실적이므로 제외합니다.
   */
  MAX_PLAUSIBLE_SPEED_MPS: 12,
} as const;

export type GpsSample = Coordinate & {
  accuracy: number | null;
  heading: number | null;
  speed: number | null;
  timestamp: number;
  recordedAt: string;
};

export type GpsRejectReason =
  | 'invalid-coordinate'
  | 'invalid-timestamp'
  | 'poor-accuracy'
  | 'duplicate-distance'
  | 'unreasonable-jump'
  | 'unreasonable-speed'
  | null;

/**
 * heading 보간 시, 이전 값과 신규 값을 섞는 비율(0~1).
 * 값이 작을수록 더 부드럽지만 반응이 느려집니다.
 */
const HEADING_SMOOTHING_FACTOR = 0.35;

/**
 * heading을 갱신할 최소 이동 거리(m).
 * 거의 정지 상태에서는 방향이 튀므로 마지막 유효 heading을 유지합니다.
 */
const HEADING_MIN_MOVE_M = 2;

/**
 * 좌표 입력을 { latitude, longitude } 형태로 정규화합니다.
 * lat/lng, latitude/longitude 두 형태를 모두 허용하고, 잘못된 값은 null을 반환합니다.
 */
export function normalizeCoordinate(input: unknown): Coordinate | null {
  if (!input || typeof input !== 'object') {
    return null;
  }

  const candidate = input as Record<string, unknown>;
  const latitude = candidate.latitude ?? candidate.lat;
  const longitude = candidate.longitude ?? candidate.lng;

  if (
    typeof latitude !== 'number' ||
    typeof longitude !== 'number' ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude)
  ) {
    return null;
  }

  return { latitude, longitude };
}

/** 두 각도(0~360) 사이 최단 회전 차이(-180~180). */
function shortestAngleDelta(from: number, to: number): number {
  return ((((to - from) % 360) + 540) % 360) - 180;
}

/**
 * 다음 heading 후보를 계산합니다.
 * - GPS heading이 유효하면 우선 사용, 없으면 from→to bearing.
 * - 이동 거리가 너무 짧으면(거의 정지) 마지막 heading을 유지합니다.
 * - 이전 heading과 부드럽게 보간하여 급격한 튐을 막습니다.
 */
export function smoothHeading(
  previousHeading: number | null,
  gpsHeading: number | null | undefined,
  from: Coordinate | null,
  to: Coordinate,
): number | null {
  let target: number | null = null;

  if (gpsHeading != null && Number.isFinite(gpsHeading) && gpsHeading >= 0) {
    target = gpsHeading;
  } else if (from && haversineDistance(from, to) >= HEADING_MIN_MOVE_M) {
    target = bearingBetween(from, to);
  }

  if (target == null) {
    return previousHeading;
  }

  if (previousHeading == null) {
    return target;
  }

  const delta = shortestAngleDelta(previousHeading, target);
  return (previousHeading + delta * HEADING_SMOOTHING_FACTOR + 360) % 360;
}

/** GPS heading 우선, 없으면 이동 방향, 없으면 0°. */
export function resolveMovementHeading(
  gpsHeading: number | null | undefined,
  from: Coordinate | null,
  to: Coordinate,
): number {
  if (gpsHeading != null && Number.isFinite(gpsHeading) && gpsHeading >= 0) {
    return gpsHeading;
  }

  if (from && haversineDistance(from, to) >= 2) {
    return bearingBetween(from, to);
  }

  return 0;
}

function isAccuracyAcceptable(accuracy: number | null | undefined): boolean {
  // accuracy 미제공 플랫폼은 하드 필터 대신 다른 조건(거리·속도)에 맡깁니다.
  if (accuracy == null || Number.isNaN(accuracy)) {
    return true;
  }

  return accuracy <= GPS_TRACKING.MAX_ACCEPTABLE_ACCURACY_M;
}

export function isValidCoordinateValue(point: Coordinate): boolean {
  return (
    Number.isFinite(point.latitude) &&
    Number.isFinite(point.longitude) &&
    point.latitude >= -90 &&
    point.latitude <= 90 &&
    point.longitude >= -180 &&
    point.longitude <= 180
  );
}

export function getGpsSampleRejectReason(
  candidate: GpsSample,
  lastPoint: GpsSample | null,
): GpsRejectReason {
  if (!isValidCoordinateValue(candidate)) {
    return 'invalid-coordinate';
  }

  if (!Number.isFinite(candidate.timestamp) || candidate.timestamp <= 0) {
    return 'invalid-timestamp';
  }

  if (!isAccuracyAcceptable(candidate.accuracy)) {
    return 'poor-accuracy';
  }

  if (!lastPoint) {
    return null;
  }

  if (candidate.timestamp <= lastPoint.timestamp) {
    return 'invalid-timestamp';
  }

  const segmentDistanceM = haversineDistance(lastPoint, candidate);

  if (segmentDistanceM < GPS_TRACKING.MIN_POINT_DISTANCE_M) {
    return 'duplicate-distance';
  }

  if (segmentDistanceM > GPS_TRACKING.MAX_SEGMENT_DISTANCE_M) {
    return 'unreasonable-jump';
  }

  const elapsedSec = Math.max((candidate.timestamp - lastPoint.timestamp) / 1000, 0.001);
  const calculatedSpeedMps = segmentDistanceM / elapsedSec;
  const reportedSpeedMps =
    candidate.speed != null && Number.isFinite(candidate.speed) && candidate.speed >= 0
      ? candidate.speed
      : null;
  const speedMps = Math.max(calculatedSpeedMps, reportedSpeedMps ?? 0);

  if (speedMps > GPS_TRACKING.MAX_PLAUSIBLE_SPEED_MPS) {
    return 'unreasonable-speed';
  }

  return null;
}

/**
 * 경로(run_points)에 새 좌표를 추가해도 되는지 판단합니다.
 * 지도 마커 갱신과 경로 저장을 분리할 때 사용합니다.
 */
export function shouldAddPointToRoute(
  candidate: GpsSample,
  lastPoint: GpsSample | null,
): boolean {
  return getGpsSampleRejectReason(candidate, lastPoint) === null;
}

/**
 * 지도상 현재 위치 표시용 — accuracy만 검사합니다.
 * 경로에는 남기지 않더라도, 신호가 너무 나쁠 때는 마커도 갱신하지 않습니다.
 */
export function shouldUpdateLiveLocation(accuracy: number | null | undefined): boolean {
  return isAccuracyAcceptable(accuracy);
}

export type RoutePointLike = {
  latitude: number;
  longitude: number;
  recordedAt: string;
};

/**
 * 여러 출처(foreground/background)의 좌표를 하나의 깨끗한 경로로 병합합니다.
 * - 잘못된 좌표 제거 → recordedAt(시간) 기준 정렬 → 순차 필터(중복/순간이동/과속 제외).
 * 백그라운드 병합과 최종 저장 양쪽에서 사용합니다.
 */
export function buildCleanRoute<T extends RoutePointLike>(points: T[]): T[] {
  const sorted = points
    .filter(
      (point) =>
        Number.isFinite(point.latitude) &&
        Number.isFinite(point.longitude) &&
        Boolean(point.recordedAt),
    )
    .sort((a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime());

  const result: T[] = [];

  for (const point of sorted) {
    const last = result[result.length - 1] ?? null;
    const candidate: GpsSample = {
      latitude: point.latitude,
      longitude: point.longitude,
      accuracy: null,
      heading: null,
      speed: null,
      timestamp: new Date(point.recordedAt).getTime(),
      recordedAt: point.recordedAt,
    };
    const lastSample: GpsSample | null = last
      ? {
          latitude: last.latitude,
          longitude: last.longitude,
          accuracy: null,
          heading: null,
          speed: null,
          timestamp: new Date(last.recordedAt).getTime(),
          recordedAt: last.recordedAt,
        }
      : null;

    if (shouldAddPointToRoute(candidate, lastSample)) {
      result.push(point);
    }
  }

  return result;
}

export function toGpsSample(position: {
  coords: {
    latitude: number;
    longitude: number;
    accuracy?: number | null;
    heading?: number | null;
    speed?: number | null;
  };
  timestamp: number;
}): GpsSample {
  const timestamp =
    Number.isFinite(position.timestamp) && position.timestamp > 0 ? position.timestamp : Date.now();

  return {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    accuracy: position.coords.accuracy ?? null,
    heading: position.coords.heading ?? null,
    speed: position.coords.speed ?? null,
    timestamp,
    recordedAt: new Date(timestamp).toISOString(),
  };
}
