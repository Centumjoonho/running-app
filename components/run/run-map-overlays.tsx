import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { borderRadius, colors, overlays, spacing } from '@/src/constants/theme';

type StatItem = {
  label: string;
  value: string;
  unit: string;
};

type RunMapOverlaysProps = {
  stats: readonly StatItem[];
  isRunning: boolean;
  visible: boolean;
};

export function RunMapFloatingStats({ stats, isRunning, visible }: RunMapOverlaysProps) {
  if (!visible) {
    return null;
  }

  return (
    <View style={[styles.floatingCard, isRunning && styles.floatingCardActive]} pointerEvents="none">
      <View style={styles.statsRow}>
        {stats.map((stat) => (
          <View key={stat.label} style={styles.statItem}>
            <ThemedText style={styles.statLabel}>{stat.label}</ThemedText>
            <View style={styles.statValueRow}>
              <ThemedText style={styles.statValue}>{stat.value}</ThemedText>
              {stat.unit ? <ThemedText style={styles.statUnit}>{stat.unit}</ThemedText> : null}
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  floatingCard: {
    position: 'absolute',
    top: spacing.lg,
    left: spacing.lg,
    right: spacing.lg,
    backgroundColor: overlays.card,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: overlays.primaryBorder,
    paddingVertical: spacing.md + 2,
    paddingHorizontal: spacing.md,
  },
  floatingCardActive: {
    borderColor: overlays.primaryBorderActive,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
  },
  statLabel: {
    fontSize: 11,
    color: colors.mutedText,
    fontWeight: '500',
  },
  statValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  statUnit: {
    fontSize: 11,
    color: colors.mutedText,
    fontWeight: '500',
  },
});
