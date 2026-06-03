import { useEffect, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { Marker } from 'react-native-maps';

import { colors } from '@/src/constants/theme';
import type { Coordinate } from '@/src/lib/geo';

type CurrentLocationMarkerProps = {
  coordinate: Coordinate;
  /** 진행 방향(deg, 0=북, 시계방향). null이면 방향 화살표를 숨기고 점만 표시합니다. */
  heading?: number | null;
};

export function CurrentLocationMarker({ coordinate, heading }: CurrentLocationMarkerProps) {
  const [tracksViewChanges, setTracksViewChanges] = useState(true);

  const hasHeading = heading != null && Number.isFinite(heading);
  const roundedHeading = hasHeading ? Math.round(heading as number) : null;

  // 좌표·방향이 바뀌면 잠깐 동안 native snapshot을 갱신해 화살표 회전을 반영합니다.
  useEffect(() => {
    setTracksViewChanges(true);

    const timer = setTimeout(
      () => setTracksViewChanges(false),
      Platform.OS === 'ios' ? 800 : 300,
    );

    return () => clearTimeout(timer);
  }, [coordinate.latitude, coordinate.longitude, roundedHeading]);

  if (!Number.isFinite(coordinate.latitude) || !Number.isFinite(coordinate.longitude)) {
    return null;
  }

  return (
    <Marker
      identifier="current-location-marker"
      coordinate={coordinate}
      anchor={{ x: 0.5, y: 0.5 }}
      flat
      zIndex={1000}
      tracksViewChanges={tracksViewChanges}>
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

const CONTAINER_SIZE = 48;

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
    borderBottomWidth: 11,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: colors.secondary,
  },
  outer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(77, 163, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
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
