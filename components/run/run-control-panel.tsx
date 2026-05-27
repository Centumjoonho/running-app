import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { borderRadius, colors, overlays, spacing } from '@/src/constants/theme';

type RunControlPanelProps = {
  isRunning: boolean;
  isSaving: boolean;
  canRun: boolean;
  buttonLabel: string;
  missionTitle?: string;
  onPress: () => void;
};

export function RunControlPanel({
  isRunning,
  isSaving,
  canRun,
  buttonLabel,
  missionTitle,
  onPress,
}: RunControlPanelProps) {
  const subtitle = isRunning
    ? missionTitle
      ? `${missionTitle} Shape를 그리는 중이에요`
      : '당신의 길이 하나의 그림이 되고 있어요'
    : missionTitle
      ? '시작을 누르면 선택한 Shape 경로 기록이 시작됩니다'
      : '시작을 누르면 GPS 경로 기록이 시작됩니다';

  return (
    <View style={styles.panel}>
      <View style={styles.handle} />
      <ThemedText style={styles.title}>{isRunning ? '러닝 중' : '러닝 시작'}</ThemedText>
      <ThemedText style={styles.subtitle}>{subtitle}</ThemedText>

      <Pressable
        disabled={!canRun && !isRunning}
        onPress={onPress}
        style={({ pressed }) => [
          styles.button,
          isRunning ? styles.stopButton : styles.startButton,
          {
            opacity: !canRun && !isRunning ? 0.4 : isSaving ? 0.6 : pressed ? 0.88 : 1,
          },
        ]}>
        {isSaving ? (
          <ActivityIndicator color={colors.background} />
        ) : (
          <ThemedText
            style={[styles.buttonText, isRunning && styles.stopButtonText]}
            lightColor={isRunning ? colors.text : colors.background}
            darkColor={isRunning ? colors.text : colors.background}>
            {buttonLabel}
          </ThemedText>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: colors.card,
    borderTopLeftRadius: borderRadius.xxl,
    borderTopRightRadius: borderRadius.xxl,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
    gap: spacing.sm,
    borderTopWidth: 1,
    borderColor: overlays.primaryBorder,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: borderRadius.pill,
    backgroundColor: overlays.handle,
    marginBottom: spacing.xs,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: colors.mutedText,
    marginBottom: spacing.sm,
    lineHeight: 20,
  },
  button: {
    height: 56,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xs,
  },
  startButton: {
    backgroundColor: colors.primary,
  },
  stopButton: {
    backgroundColor: overlays.stop,
    borderWidth: 1,
    borderColor: colors.stop,
  },
  buttonText: {
    fontSize: 17,
    fontWeight: '700',
  },
  stopButtonText: {
    color: colors.stop,
  },
});
