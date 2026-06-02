import { useEffect, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { Marker } from 'react-native-maps';

import type { Coordinate } from '@/src/lib/geo';

type CurrentLocationMarkerProps = {
  coordinate: Coordinate;
};

export function CurrentLocationMarker({ coordinate }: CurrentLocationMarkerProps) {
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

  return (
    <Marker
      identifier="current-location-marker"
      coordinate={coordinate}
      anchor={{ x: 0.5, y: 0.5 }}
      zIndex={1000}
      tracksViewChanges={tracksViewChanges}>
      <View style={styles.outer} collapsable={false}>
        <View style={styles.inner} collapsable={false} />
      </View>
    </Marker>
  );
}

const styles = StyleSheet.create({
  outer: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(34, 197, 94, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inner: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#22c55e',
    borderWidth: 3,
    borderColor: '#ffffff',
  },
});
