import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { borderRadius, colors, overlays, spacing } from '@/src/constants/theme';
import { type ShapeMission } from '@/src/constants/shape-missions';

type ShapeMissionBannerProps = {
  mission: ShapeMission;
};

export function ShapeMissionBanner({ mission }: ShapeMissionBannerProps) {
  return (
    <View style={styles.banner}>
      <View style={styles.iconWrap}>
        <MaterialIcons name={mission.icon} size={18} color={colors.primary} />
      </View>
      <View style={styles.textWrap}>
        <ThemedText style={styles.label}>Shape Mission</ThemedText>
        <ThemedText style={styles.title}>{mission.title}</ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: overlays.primaryBorderActive,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.sm,
    backgroundColor: overlays.primaryBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: {
    flex: 1,
    gap: 2,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.secondary,
    letterSpacing: 0.3,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
});
