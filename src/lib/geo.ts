export type Coordinate = {
  latitude: number;
  longitude: number;
};

const EARTH_RADIUS_M = 6371000;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
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

export function totalRouteDistanceKm(coordinates: Coordinate[]): number {
  let meters = 0;

  for (let i = 1; i < coordinates.length; i += 1) {
    meters += haversineDistance(coordinates[i - 1], coordinates[i]);
  }

  return meters / 1000;
}
