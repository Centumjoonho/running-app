import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { colors, overlays } from '@/src/constants/theme';

type RunCountdownOverlayProps = {
  visible: boolean;
  countdown: number;
};

export function RunCountdownOverlay({ visible, countdown }: RunCountdownOverlayProps) {
  if (!visible || countdown <= 0) {
    return null;
  }

  return (
    <View style={styles.overlay} pointerEvents="none">
      <View style={styles.circle}>
        <ThemedText style={styles.number}>{countdown}</ThemedText>
      </View>
    </View>
  );
}

const CIRCLE_SIZE = 112;

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(11, 15, 20, 0.55)',
  },
  circle: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: overlays.card,
    borderWidth: 2,
    borderColor: overlays.primaryBorderActive,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  number: {
    fontSize: 56,
    fontWeight: '800',
    color: colors.primary,
    fontVariant: ['tabular-nums'],
    lineHeight: 64,
    includeFontPadding: false,
  },
});
