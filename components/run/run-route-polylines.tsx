import { Polyline } from 'react-native-maps';

import { colors, overlays, runMap } from '@/src/constants/theme';
import { type Coordinate } from '@/src/lib/geo';

type RunRoutePolylinesProps = {
  coordinates: Coordinate[];
};

export function RunRoutePolylines({ coordinates }: RunRoutePolylinesProps) {
  if (coordinates.length < 2) {
    return null;
  }

  return (
    <>
      <Polyline
        coordinates={coordinates}
        strokeColor={overlays.routeGlow}
        strokeWidth={runMap.routeGlowStrokeWidth}
        lineCap="round"
        lineJoin="round"
      />
      <Polyline
        coordinates={coordinates}
        strokeColor={colors.primary}
        strokeWidth={runMap.routeStrokeWidth}
        lineCap="round"
        lineJoin="round"
      />
    </>
  );
}
