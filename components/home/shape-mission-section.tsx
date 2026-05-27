import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { borderRadius, colors, spacing } from '@/src/constants/theme';
import { SHAPE_MISSIONS, type ShapeMission } from '@/src/constants/shape-missions';
import { useShapeMission } from '@/src/contexts/shape-mission-context';

function MissionItem({
  mission,
  onPress,
}: {
  mission: ShapeMission;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.missionItem, pressed && styles.missionItemPressed]}>
      <View style={styles.missionIconWrap}>
        <MaterialIcons name={mission.icon} size={22} color={colors.primary} />
      </View>
      <View style={styles.missionTextWrap}>
        <ThemedText style={styles.missionItemTitle}>{mission.title}</ThemedText>
        <ThemedText style={styles.missionItemDescription}>{mission.description}</ThemedText>
      </View>
      <MaterialIcons name="chevron-right" size={20} color={colors.mutedText} />
    </Pressable>
  );
}

export function ShapeMissionSection() {
  const router = useRouter();
  const { setMission } = useShapeMission();

  const handleSelectMission = (mission: ShapeMission) => {
    setMission(mission);
    router.push('/(tabs)/run');
  };

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <View style={styles.badge}>
          <ThemedText style={styles.badgeText}>Shape Mission</ThemedText>
        </View>
        <ThemedText style={styles.title}>오늘의 Shape에 도전하세요</ThemedText>
        <ThemedText style={styles.subtitle}>
          원하는 모양을 선택하고, 달리며 하나의 작품을 완성해보세요
        </ThemedText>
      </View>

      <View style={styles.list}>
        {SHAPE_MISSIONS.map((mission) => (
          <MissionItem
            key={mission.id}
            mission={mission}
            onPress={() => handleSelectMission(mission)}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
  header: {
    gap: spacing.sm,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(77, 163, 255, 0.15)',
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.secondary,
    letterSpacing: 0.4,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: colors.mutedText,
    lineHeight: 20,
  },
  list: {
    gap: spacing.sm,
  },
  missionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  missionItemPressed: {
    opacity: 0.88,
    borderColor: 'rgba(53, 242, 165, 0.35)',
  },
  missionIconWrap: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.sm,
    backgroundColor: 'rgba(53, 242, 165, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  missionTextWrap: {
    flex: 1,
    gap: spacing.xs,
  },
  missionItemTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  missionItemDescription: {
    fontSize: 12,
    color: colors.mutedText,
    lineHeight: 17,
  },
});
