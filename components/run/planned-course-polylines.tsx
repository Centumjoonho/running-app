import { Polyline } from 'react-native-maps';

import { colors, overlays } from '@/src/constants/theme';
import type { Coordinate } from '@/src/lib/geo';

type PlannedCoursePolylinesProps = {
  coordinates: Coordinate[];
};

export function PlannedCoursePolylines({ coordinates }: PlannedCoursePolylinesProps) {
  if (coordinates.length < 2) {
    return null;
  }

  return (
    <>
      <Polyline
        coordinates={coordinates}
        strokeColor={overlays.secondaryGlow}
        strokeWidth={8}
        lineCap="round"
        lineJoin="round"
      />
      <Polyline
        coordinates={coordinates}
        strokeColor={colors.secondary}
        strokeWidth={3}
        lineCap="round"
        lineJoin="round"
        lineDashPattern={[10, 8]}
      />
    </>
  );
}
