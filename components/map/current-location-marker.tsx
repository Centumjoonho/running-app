import { useEffect, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { Marker } from 'react-native-maps';

import { colors } from '@/src/constants/theme';
import type { Coordinate } from '@/src/lib/geo';

type CurrentLocationMarkerProps = {
  coordinate: Coordinate;
  /** Movement heading in degrees. 0 points north. */
  heading?: number | null;
  /** Keep native marker snapshots live while the runner is actively moving. */
  active?: boolean;
};

export function CurrentLocationMarker({
  coordinate,
  heading,
  active = false,
}: CurrentLocationMarkerProps) {
  const [tracksViewChanges, setTracksViewChanges] = useState(true);

  const hasHeading = heading != null && Number.isFinite(heading);
  const roundedHeading = hasHeading ? Math.round(heading as number) : null;

  useEffect(() => {
    setTracksViewChanges(true);

    const timer = setTimeout(
      () => setTracksViewChanges(false),
      Platform.OS === 'ios' ? 800 : 300,
    );

    return () => clearTimeout(timer);
  }, [active, coordinate.latitude, coordinate.longitude, roundedHeading]);

  if (!Number.isFinite(coordinate.latitude) || !Number.isFinite(coordinate.longitude)) {
    return null;
  }

  const shouldTrackViewChanges = active || tracksViewChanges;

  return (
    <Marker
      identifier="current-location-marker"
      coordinate={coordinate}
      anchor={{ x: 0.5, y: 0.5 }}
      flat
      zIndex={1000}
      tracksViewChanges={shouldTrackViewChanges}>
      <View style={styles.container} collapsable={false}>
        {roundedHeading != null ? (
          <View
            style={[styles.rotor, { transform: [{ rotate: `${roundedHeading}deg` }] }]}
            collapsable={false}>
            <View style={styles.arrow} collapsable={false} />
          </View>
        ) : null}
        <View style={styles.outer} collapsable={false}>
          <View style={styles.inner} collapsable={false} />
        </View>
      </View>
    </Marker>
  );
}

const CONTAINER_SIZE = 52;

const styles = StyleSheet.create({
  container: {
    width: CONTAINER_SIZE,
    height: CONTAINER_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rotor: {
    position: 'absolute',
    width: CONTAINER_SIZE,
    height: CONTAINER_SIZE,
    alignItems: 'center',
  },
  arrow: {
    width: 0,
    height: 0,
    borderLeftWidth: 7,
    borderRightWidth: 7,
    borderBottomWidth: 12,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: colors.secondary,
  },
  outer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(77, 163, 255, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.9)',
    shadowColor: colors.secondary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 8,
    elevation: 8,
  },
  inner: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.secondary,
    borderWidth: 3,
    borderColor: '#ffffff',
  },
});
