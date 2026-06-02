export type Coordinate = {
  latitude: number;
  longitude: number;
};

const EARTH_RADIUS_M = 6371000;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/** 미터 단위 offset(east/north)을 위도·경도로 변환합니다. */
export function offsetMetersToCoordinate(
  center: Coordinate,
  eastMeters: number,
  northMeters: number,
): Coordinate {
  const latitude =
    center.latitude + (northMeters / EARTH_RADIUS_M) * (180 / Math.PI);
  const longitude =
    center.longitude +
    (eastMeters / (EARTH_RADIUS_M * Math.cos(toRadians(center.latitude)))) * (180 / Math.PI);

  return { latitude, longitude };
}

/** 두 좌표 사이 거리(m). */
export function distanceBetweenMeters(a: Coordinate, b: Coordinate): number {
  return haversineDistance(a, b);
}

export function haversineDistance(a: Coordinate, b: Coordinate): number {
  const dLat = toRadians(b.latitude - a.latitude);
  const dLon = toRadians(b.longitude - a.longitude);
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;

  return EARTH_RADIUS_M * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

/** 두 좌표 사이 방위각(deg, 0=북, 시계방향). */
export function bearingBetween(from: Coordinate, to: Coordinate): number {
  const lat1 = toRadians(from.latitude);
  const lat2 = toRadians(to.latitude);
  const dLon = toRadians(to.longitude - from.longitude);
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);

  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

export function totalRouteDistanceKm(coordinates: Coordinate[]): number {
  let meters = 0;

  for (let i = 1; i < coordinates.length; i += 1) {
    meters += haversineDistance(coordinates[i - 1], coordinates[i]);
  }

  return meters / 1000;
}

type MapRegion = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

export function getMapRegionFromCoordinates(
  coordinates: Coordinate[],
  minDelta = 0.01,
): MapRegion | null {
  if (coordinates.length === 0) {
    return null;
  }

  if (coordinates.length === 1) {
    return {
      latitude: coordinates[0].latitude,
      longitude: coordinates[0].longitude,
      latitudeDelta: minDelta,
      longitudeDelta: minDelta,
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
    latitudeDelta: Math.max((maxLat - minLat) * 1.4, minDelta),
    longitudeDelta: Math.max((maxLng - minLng) * 1.4, minDelta),
  };
}
