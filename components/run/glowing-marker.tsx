import { StyleSheet, View } from 'react-native';

import { colors, overlays } from '@/src/constants/theme';

export function GlowingLocationMarker() {
  return (
    <View style={styles.wrapper}>
      <View style={styles.pulseOuter} />
      <View style={styles.pulseInner} />
      <View style={styles.core} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseOuter: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: overlays.routeGlow,
  },
  pulseInner: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: overlays.secondaryGlow,
  },
  core: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.text,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 8,
    elevation: 6,
  },
});
