import { useEffect, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { Marker } from 'react-native-maps';

import { colors } from '@/src/constants/theme';
import type { Coordinate } from '@/src/lib/geo';

type RouteEndpointMarkersProps = {
  coordinates: Coordinate[];
};

type EndpointMarkerProps = {
  identifier: 'start-marker' | 'end-marker';
  coordinate: Coordinate;
  variant: 'start' | 'end';
};

function EndpointMarker({ identifier, coordinate, variant }: EndpointMarkerProps) {
  const [tracksViewChanges, setTracksViewChanges] = useState(true);

  useEffect(() => {
    setTracksViewChanges(true);

    const timer = setTimeout(
      () => setTracksViewChanges(false),
      Platform.OS === 'ios' ? 1000 : 300,
    );

    return () => clearTimeout(timer);
  }, [coordinate.latitude, coordinate.longitude]);

  if (!Number.isFinite(coordinate.latitude) || !Number.isFinite(coordinate.longitude)) {
    return null;
  }

  const isStart = variant === 'start';

  return (
    <Marker
      identifier={identifier}
      coordinate={coordinate}
      anchor={{ x: 0.5, y: 0.5 }}
      zIndex={isStart ? 900 : 901}
      tracksViewChanges={tracksViewChanges}>
      <View
        style={[styles.outer, isStart ? styles.startOuter : styles.endOuter]}
        collapsable={false}>
        <View style={[styles.inner, isStart ? styles.startInner : styles.endInner]} collapsable={false} />
      </View>
    </Marker>
  );
}

export function RouteEndpointMarkers({ coordinates }: RouteEndpointMarkersProps) {
  if (coordinates.length === 0) {
    return null;
  }

  const start = coordinates[0];
  const end = coordinates.length > 1 ? coordinates[coordinates.length - 1] : null;
  const hasDistinctEnd =
    end &&
    (end.latitude !== start.latitude || end.longitude !== start.longitude);

  return (
    <>
      <EndpointMarker identifier="start-marker" coordinate={start} variant="start" />
      {hasDistinctEnd && end ? (
        <EndpointMarker identifier="end-marker" coordinate={end} variant="end" />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  outer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startOuter: {
    backgroundColor: 'rgba(34, 197, 94, 0.25)',
  },
  endOuter: {
    backgroundColor: 'rgba(255, 69, 58, 0.25)',
  },
  inner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2.5,
    borderColor: colors.text,
  },
  startInner: {
    backgroundColor: '#22c55e',
  },
  endInner: {
    backgroundColor: colors.stop,
  },
});
