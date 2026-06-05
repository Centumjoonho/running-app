import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { borderRadius, colors, overlays, spacing } from '@/src/constants/theme';

const HOLD_TO_FINISH_DURATION_MS = 3000;

type HoldToFinishButtonProps = {
  disabled?: boolean;
  loading?: boolean;
  onFinish: () => void;
};

export function HoldToFinishButton({
  disabled = false,
  loading = false,
  onFinish,
}: HoldToFinishButtonProps) {
  const progress = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const completedRef = useRef(false);
  const [isHolding, setIsHolding] = useState(false);

  const resetHold = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    if (!completedRef.current) {
      progress.stopAnimation();
      Animated.timing(progress, {
        toValue: 0,
        duration: 160,
        useNativeDriver: false,
      }).start();
    }

    setIsHolding(false);
  };

  const completeHold = () => {
    if (completedRef.current || disabled || loading) {
      return;
    }

    completedRef.current = true;
    setIsHolding(false);
    progress.stopAnimation();
    progress.setValue(1);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    onFinish();
  };

  const startHold = () => {
    if (disabled || loading || completedRef.current) {
      return;
    }

    setIsHolding(true);
    progress.setValue(0);
    void Haptics.selectionAsync().catch(() => undefined);

    Animated.timing(progress, {
      toValue: 1,
      duration: HOLD_TO_FINISH_DURATION_MS,
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished) {
        completeHold();
      }
    });

    timerRef.current = setTimeout(completeHold, HOLD_TO_FINISH_DURATION_MS);
  };

  useEffect(() => {
    if (!loading) {
      completedRef.current = false;
      progress.setValue(0);
    }
  }, [loading, progress]);

  useEffect(
    () => () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      progress.stopAnimation();
    },
    [progress],
  );

  const fillWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });
  const label = loading ? '종료 중...' : isHolding ? '계속 누르세요' : '길게 눌러 종료';

  return (
    <Pressable
      disabled={disabled || loading}
      onPressIn={startHold}
      onPressOut={resetHold}
      onResponderTerminate={resetHold}
      accessibilityRole="button"
      accessibilityLabel="러닝 종료"
      accessibilityHint="3초 동안 길게 누르면 러닝이 종료됩니다"
      style={({ pressed }) => [
        styles.button,
        (disabled || loading) && styles.buttonDisabled,
        pressed && !loading && styles.buttonPressed,
      ]}>
      <Animated.View style={[styles.fill, { width: fillWidth }]} />
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator color={colors.background} />
        ) : (
          <ThemedText style={styles.label}>{label}</ThemedText>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 56,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    justifyContent: 'center',
    backgroundColor: overlays.stop,
    borderWidth: 1,
    borderColor: colors.stop,
    marginTop: spacing.xs,
  },
  buttonDisabled: {
    opacity: 0.65,
  },
  buttonPressed: {
    opacity: 0.94,
  },
  fill: {
    ...StyleSheet.absoluteFillObject,
    right: undefined,
    backgroundColor: colors.stop,
  },
  content: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  label: {
    fontSize: 17,
    lineHeight: 23,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
  },
});
