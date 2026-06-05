import { useEffect, useRef } from 'react';
import { ActivityIndicator, Animated, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { borderRadius, colors, overlays, spacing } from '@/src/constants/theme';

type RunStartTransitionProps = {
  visible: boolean;
  preparing: boolean;
  label: string | null;
};

export function RunStartTransition({
  visible,
  preparing,
  label,
}: RunStartTransitionProps) {
  const scale = useRef(new Animated.Value(0.82)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) {
      return;
    }

    scale.setValue(0.82);
    opacity.setValue(0);

    const animation = Animated.parallel([
      Animated.timing(scale, {
        toValue: 1.12,
        duration: preparing ? 600 : 460,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 120,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: preparing ? 1 : 0,
          duration: preparing ? 480 : 340,
          useNativeDriver: true,
        }),
      ]),
    ]);

    animation.start();

    return () => animation.stop();
  }, [label, opacity, preparing, scale, visible]);

  if (!visible) {
    return null;
  }

  return (
    <View style={styles.overlay} pointerEvents="none">
      {preparing ? (
        <View style={styles.prepareCard}>
          <ActivityIndicator color={colors.primary} size="large" />
          <ThemedText style={styles.prepareTitle}>GPS 연결 중</ThemedText>
          <ThemedText style={styles.prepareSubtitle}>현재 위치를 확인하고 있습니다</ThemedText>
        </View>
      ) : (
        <Animated.View
          style={[
            styles.countdownCircle,
            {
              opacity,
              transform: [{ scale }],
            },
          ]}>
          <ThemedText style={styles.countdownText}>{label}</ThemedText>
        </Animated.View>
      )}
    </View>
  );
}

const CIRCLE_SIZE = 128;

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(11, 15, 20, 0.62)',
  },
  prepareCard: {
    minWidth: 220,
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.lg,
    backgroundColor: overlays.card,
    borderWidth: 1,
    borderColor: overlays.primaryBorderActive,
  },
  prepareTitle: {
    marginTop: spacing.sm,
    fontSize: 21,
    lineHeight: 28,
    fontWeight: '800',
    color: colors.text,
  },
  prepareSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.mutedText,
    textAlign: 'center',
  },
  countdownCircle: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: overlays.card,
    borderWidth: 2,
    borderColor: overlays.primaryBorderActive,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 18,
    elevation: 12,
  },
  countdownText: {
    fontSize: 48,
    lineHeight: 58,
    fontWeight: '900',
    color: colors.primary,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
    includeFontPadding: false,
  },
});
