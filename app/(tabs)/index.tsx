import { useFocusEffect } from '@react-navigation/native';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ShapeMissionSection } from '@/components/home/shape-mission-section';
import { ThemedText } from '@/components/themed-text';
import { borderRadius, colors, overlays, spacing } from '@/src/constants/theme';
import { useAuth } from '@/src/contexts/auth-context';
import { useShapeMission } from '@/src/contexts/shape-mission-context';
import {
  formatDistanceKm,
  formatDuration,
  formatRunDate,
  formatRunTitle,
} from '@/src/lib/format';
import { getRunSessions, type RunSession } from '@/src/lib/runs';

function getMonthlyDistanceKm(runs: RunSession[]): number {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const meters = runs
    .filter((run) => new Date(run.started_at) >= monthStart)
    .reduce((sum, run) => sum + run.distance_m, 0);

  return meters / 1000;
}

function RecentRunItem({ run, onPress }: { run: RunSession; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.recentItem, pressed && styles.recentItemPressed]}>
      <View style={styles.recentAccent} />
      <View style={styles.recentBody}>
        <ThemedText style={styles.recentTitle}>{formatRunTitle(run.started_at)}</ThemedText>
        <ThemedText style={styles.recentMeta}>
          {formatRunDate(run.started_at)} · {formatDistanceKm(run.distance_m)} km ·{' '}
          {formatDuration(run.duration_seconds)}
        </ThemedText>
      </View>
      <ThemedText style={styles.viewShapeSmall}>View Shape</ThemedText>
    </Pressable>
  );
}

function RecentRunsEmptyState() {
  return (
    <View style={styles.recentEmpty}>
      <MaterialIcons name="brush" size={24} color={colors.mutedText} />
      <ThemedText style={styles.recentEmptyTitle}>아직 그린 러닝이 없어요</ThemedText>
      <ThemedText style={styles.recentEmptyHint}>첫 번째 Myle을 시작해보세요</ThemedText>
    </View>
  );
}

export default function HomeScreen() {
  const { session } = useAuth();
  const router = useRouter();
  const { clearMission } = useShapeMission();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();

  const [runs, setRuns] = useState<RunSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const monthlyDistanceKm = useMemo(() => getMonthlyDistanceKm(runs), [runs]);
  const recentRuns = useMemo(() => runs.slice(0, 3), [runs]);
  const hasRuns = runs.length > 0;

  const loadRuns = useCallback(async () => {
    const userId = session?.user?.id;
    if (!userId) {
      setRuns([]);
      setError('로그인 정보를 찾을 수 없습니다.');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const { data, error: fetchError } = await getRunSessions(userId);
    setRuns(data);
    setError(fetchError);
    setIsLoading(false);
  }, [session?.user?.id]);

  useFocusEffect(
    useCallback(() => {
      loadRuns();
    }, [loadRuns]),
  );

  const goToRun = () => {
    clearMission();
    router.push('/(tabs)/run');
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + spacing.lg,
            paddingBottom: tabBarHeight + spacing.xxl,
          },
        ]}
        showsVerticalScrollIndicator={false}
        bounces>
        <View style={styles.header}>
          <ThemedText style={styles.logo}>Myle</ThemedText>
          <ThemedText style={styles.tagline}>Draw your run.</ThemedText>
        </View>

        {isLoading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <>
            {error ? (
              <View style={styles.errorBanner}>
                <ThemedText style={styles.errorText}>{error}</ThemedText>
              </View>
            ) : null}

            <Pressable
              onPress={goToRun}
              style={({ pressed }) => [styles.startCard, pressed && styles.startCardPressed]}>
              <View style={styles.startCardTop}>
                <View style={styles.startIconWrap}>
                  <MaterialIcons name="directions-run" size={28} color={colors.primary} />
                </View>
                <View style={styles.startTextWrap}>
                  <ThemedText style={styles.startTitle}>오늘의 러닝 시작</ThemedText>
                  <ThemedText style={styles.startSubtitle}>
                    {hasRuns
                      ? '오늘도 하나의 길을 그려보세요'
                      : '첫 번째 Myle을 그려볼 시간이에요'}
                  </ThemedText>
                </View>
              </View>
              <View style={styles.startButton}>
                <ThemedText style={styles.startButtonText} lightColor={colors.background} darkColor={colors.background}>
                  러닝 시작
                </ThemedText>
                <MaterialIcons name="arrow-forward" size={18} color={colors.background} />
              </View>
            </Pressable>

            <View style={styles.monthlyCard}>
              <ThemedText style={styles.cardLabel}>이번 달 누적 거리</ThemedText>
              <View style={styles.monthlyValueRow}>
                <ThemedText style={styles.monthlyValue}>{monthlyDistanceKm.toFixed(2)}</ThemedText>
                <ThemedText style={styles.monthlyUnit}>km</ThemedText>
              </View>
              <ThemedText style={styles.cardHint}>
                {hasRuns ? '이번 달 그려온 길의 길이예요' : '아직 이번 달 기록이 없어요'}
              </ThemedText>
            </View>

            <ShapeMissionSection />

            <View style={styles.recentSection}>
              <ThemedText style={styles.sectionTitle}>최근 Myle</ThemedText>
              {recentRuns.length > 0 ? (
                <View style={styles.recentList}>
                  {recentRuns.map((run) => (
                    <RecentRunItem
                      key={run.id}
                      run={run}
                      onPress={() =>
                        router.push({ pathname: '/(tabs)/records/[id]', params: { id: run.id } })
                      }
                    />
                  ))}
                </View>
              ) : (
                <RecentRunsEmptyState />
              )}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    gap: spacing.lg,
  },
  header: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
    paddingTop: spacing.sm,
  },
  logo: {
    fontSize: 34,
    fontWeight: '800',
    lineHeight: 44,
    color: colors.text,
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.primary,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  loadingWrap: {
    paddingVertical: spacing.xxxl,
    alignItems: 'center',
  },
  errorBanner: {
    backgroundColor: overlays.stop,
    borderRadius: borderRadius.sm,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.stop,
  },
  errorText: {
    color: colors.stop,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  startCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: overlays.primaryBorderActive,
    padding: spacing.lg,
    gap: spacing.lg,
  },
  startCardPressed: {
    opacity: 0.9,
  },
  startCardTop: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
  },
  startIconWrap: {
    width: 52,
    height: 52,
    borderRadius: borderRadius.md,
    backgroundColor: overlays.primaryBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startTextWrap: {
    flex: 1,
    gap: spacing.xs,
  },
  startTitle: {
    fontSize: 18,
    lineHeight: 26,
    fontWeight: '700',
    color: colors.text,
  },
  startSubtitle: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.mutedText,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    height: 52,
  },
  startButtonText: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
  },
  monthlyCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    minHeight: 120,
    gap: spacing.sm,
  },
  cardLabel: {
    fontSize: 13,
    lineHeight: 20,
    color: colors.mutedText,
    fontWeight: '500',
  },
  monthlyValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
  },
  monthlyValue: {
    fontSize: 36,
    lineHeight: 44,
    fontWeight: '800',
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  monthlyUnit: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '600',
    color: colors.mutedText,
  },
  cardHint: {
    fontSize: 13,
    lineHeight: 20,
    color: colors.mutedText,
  },
  recentSection: {
    gap: spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    lineHeight: 26,
    fontWeight: '700',
    color: colors.text,
  },
  recentList: {
    gap: spacing.sm,
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  recentItemPressed: {
    opacity: 0.88,
    borderColor: overlays.primaryBorder,
  },
  recentAccent: {
    width: 3,
    alignSelf: 'stretch',
    backgroundColor: colors.primary,
  },
  recentBody: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
  },
  recentTitle: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
    color: colors.text,
  },
  recentMeta: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.mutedText,
  },
  viewShapeSmall: {
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '600',
    color: colors.primary,
    paddingRight: spacing.md,
  },
  recentEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  recentEmptyTitle: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  recentEmptyHint: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.mutedText,
    textAlign: 'center',
  },
});
