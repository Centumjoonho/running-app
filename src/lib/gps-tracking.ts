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
  MAX_ACCEPTABLE_ACCURACY_M: 25,

  /**
   * 단일 업데이트에서 허용하는 최대 이동 거리(m).
   * 순간 점프(“텔레포트”)는 GPS 글리치로 보고 경로에서 제외합니다.
   */
  MAX_SEGMENT_DISTANCE_M: 80,

  /**
   * 두 포인트 사이 최대 허용 속도(m/s). 약 54km/h.
   * 육상 러닝보다 훨씬 빠른 구간은 비현실적이므로 제외합니다.
   */
  MAX_PLAUSIBLE_SPEED_MPS: 15,
} as const;

export type GpsSample = Coordinate & {
  accuracy: number | null;
  heading: number | null;
  recordedAt: string;
};

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

/**
 * 경로(run_points)에 새 좌표를 추가해도 되는지 판단합니다.
 * 지도 마커 갱신과 경로 저장을 분리할 때 사용합니다.
 */
export function shouldAddPointToRoute(
  candidate: GpsSample,
  lastPoint: GpsSample | null,
): boolean {
  if (!isAccuracyAcceptable(candidate.accuracy)) {
    return false;
  }

  if (!lastPoint) {
    return true;
  }

  const segmentDistanceM = haversineDistance(lastPoint, candidate);

  if (segmentDistanceM < GPS_TRACKING.MIN_POINT_DISTANCE_M) {
    return false;
  }

  if (segmentDistanceM > GPS_TRACKING.MAX_SEGMENT_DISTANCE_M) {
    return false;
  }

  const elapsedMs =
    new Date(candidate.recordedAt).getTime() - new Date(lastPoint.recordedAt).getTime();
  const elapsedSec = Math.max(elapsedMs / 1000, 0.001);
  const maxPlausibleDistanceM = elapsedSec * GPS_TRACKING.MAX_PLAUSIBLE_SPEED_MPS;

  if (segmentDistanceM > maxPlausibleDistanceM) {
    return false;
  }

  return true;
}

/**
 * 지도상 현재 위치 표시용 — accuracy만 검사합니다.
 * 경로에는 남기지 않더라도, 신호가 너무 나쁠 때는 마커도 갱신하지 않습니다.
 */
export function shouldUpdateLiveLocation(accuracy: number | null | undefined): boolean {
  return isAccuracyAcceptable(accuracy);
}

export function toGpsSample(position: {
  coords: {
    latitude: number;
    longitude: number;
    accuracy?: number | null;
    heading?: number | null;
  };
  timestamp: number;
}): GpsSample {
  return {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    accuracy: position.coords.accuracy ?? null,
    heading: position.coords.heading ?? null,
    recordedAt: new Date(position.timestamp).toISOString(),
  };
}
