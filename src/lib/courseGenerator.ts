import { getCourseTemplate, type CourseShape } from '@/src/lib/courseTemplates';
import {
  type Coordinate,
  offsetMetersToCoordinate,
  totalRouteDistanceKm,
} from '@/src/lib/geo';

export type GeneratedCourse = {
  coordinates: Coordinate[];
  estimatedDistanceKm: number;
  scaleMeters: number;
  shape: CourseShape;
  targetDistanceKm: number;
  center: Coordinate;
};

function templateToCoordinates(
  center: Coordinate,
  templatePoints: { x: number; y: number }[],
  scaleMeters: number,
): Coordinate[] {
  return templatePoints.map((point) =>
    offsetMetersToCoordinate(center, point.x * scaleMeters, point.y * scaleMeters),
  );
}

function findScaleForTargetDistance(
  center: Coordinate,
  templatePoints: { x: number; y: number }[],
  targetDistanceKm: number,
): number {
  let low = 100;
  let high = 8000;

  for (let i = 0; i < 28; i += 1) {
    const mid = (low + high) / 2;
    const coordinates = templateToCoordinates(center, templatePoints, mid);
    const distanceKm = totalRouteDistanceKm(coordinates);

    if (distanceKm < targetDistanceKm) {
      low = mid;
    } else {
      high = mid;
    }
  }

  return (low + high) / 2;
}

export function generateCourse(
  centerLatitude: number,
  centerLongitude: number,
  shape: CourseShape,
  targetDistanceKm: number,
): GeneratedCourse {
  const center: Coordinate = {
    latitude: centerLatitude,
    longitude: centerLongitude,
  };
  const template = getCourseTemplate(shape);
  const scaleMeters = findScaleForTargetDistance(center, template.points, targetDistanceKm);
  const coordinates = templateToCoordinates(center, template.points, scaleMeters);
  const estimatedDistanceKm = totalRouteDistanceKm(coordinates);

  return {
    coordinates,
    estimatedDistanceKm,
    scaleMeters,
    shape,
    targetDistanceKm,
    center,
  };
}
