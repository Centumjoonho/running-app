import { useFocusEffect } from '@react-navigation/native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { MyleScreen, myleScreenStyles } from '@/components/ui/myle-screen';
import { borderRadius, colors, overlays, spacing } from '@/src/constants/theme';
import { useAuth } from '@/src/contexts/auth-context';
import {
  formatDistanceKm,
  formatDuration,
  formatPaceSeconds,
  formatRunDate,
  formatRunTitle,
} from '@/src/lib/format';
import { fetchRunSessions, type RunSession } from '@/src/lib/runs';

function RunSessionCard({
  session,
  onPress,
}: {
  session: RunSession;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
      <View style={styles.cardAccent} />
      <View style={styles.cardBody}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitles}>
            <ThemedText style={styles.cardTitle}>{formatRunTitle(session.started_at)}</ThemedText>
            <ThemedText style={styles.cardDate}>{formatRunDate(session.started_at)}</ThemedText>
          </View>
          <MaterialIcons name="chevron-right" size={22} color={colors.primary} />
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <ThemedText style={styles.statLabel}>거리</ThemedText>
            <ThemedText style={styles.statValue}>{formatDistanceKm(session.distance_m)} km</ThemedText>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <ThemedText style={styles.statLabel}>시간</ThemedText>
            <ThemedText style={styles.statValue}>{formatDuration(session.duration_seconds)}</ThemedText>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <ThemedText style={styles.statLabel}>페이스</ThemedText>
            <ThemedText style={styles.statValue}>
              {formatPaceSeconds(session.avg_pace_seconds_per_km)} /km
            </ThemedText>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <ThemedText style={styles.viewShape}>View Shape</ThemedText>
        </View>
      </View>
    </Pressable>
  );
}

function RecordsEmptyState() {
  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconWrap}>
        <MaterialIcons name="brush" size={32} color={colors.primary} />
      </View>
      <ThemedText style={styles.emptyTitle}>아직 그린 러닝이 없어요</ThemedText>
      <ThemedText style={styles.emptyHint}>첫 번째 Myle을 시작해보세요</ThemedText>
    </View>
  );
}

export default function RecordsScreen() {
  const { session } = useAuth();
  const router = useRouter();

  const [runs, setRuns] = useState<RunSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadRuns = useCallback(
    async (refreshing = false) => {
      const userId = session?.user?.id;
      if (!userId) {
        setRuns([]);
        setError('로그인 정보를 찾을 수 없습니다.');
        setIsLoading(false);
        setIsRefreshing(false);
        return;
      }

      if (refreshing) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      const { data, error: fetchError } = await fetchRunSessions(userId);

      setRuns(data);
      setError(fetchError);
      setIsLoading(false);
      setIsRefreshing(false);
    },
    [session?.user?.id],
  );

  useFocusEffect(
    useCallback(() => {
      loadRuns();
    }, [loadRuns]),
  );

  return (
    <MyleScreen>
      <View style={styles.content}>
        <ThemedText style={myleScreenStyles.title}>기록</ThemedText>
        <ThemedText style={myleScreenStyles.subtitle}>내가 그린 Myle 컬렉션</ThemedText>

        {isLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : error ? (
          <View style={styles.centered}>
            <ThemedText style={myleScreenStyles.errorText}>{error}</ThemedText>
          </View>
        ) : runs.length === 0 ? (
          <RecordsEmptyState />
        ) : (
          <FlatList
            data={runs}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={() => loadRuns(true)}
                tintColor={colors.primary}
                colors={[colors.primary]}
              />
            }
            renderItem={({ item }) => (
              <RunSessionCard
                session={item}
                onPress={() =>
                  router.push({ pathname: '/(tabs)/records/[id]', params: { id: item.id } })
                }
              />
            )}
          />
        )}
      </View>
    </MyleScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
  },
  listContent: {
    gap: spacing.md,
    paddingBottom: spacing.xxxl,
  },
  card: {
    flexDirection: 'row',
    borderRadius: borderRadius.lg,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  cardPressed: {
    opacity: 0.88,
    borderColor: overlays.primaryBorderActive,
  },
  cardAccent: {
    width: 3,
    backgroundColor: colors.primary,
  },
  cardBody: {
    flex: 1,
    padding: spacing.lg,
    gap: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  cardTitles: {
    flex: 1,
    gap: spacing.xs,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
  },
  cardDate: {
    fontSize: 13,
    color: colors.mutedText,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: borderRadius.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: colors.border,
  },
  statLabel: {
    fontSize: 11,
    color: colors.mutedText,
    fontWeight: '500',
  },
  statValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  viewShape: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
    letterSpacing: 0.3,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 80,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingBottom: 80,
    paddingHorizontal: spacing.xxl,
  },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: borderRadius.full,
    backgroundColor: overlays.primaryBorder,
    borderWidth: 1,
    borderColor: overlays.primaryBorderActive,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  emptyHint: {
    fontSize: 14,
    color: colors.mutedText,
    textAlign: 'center',
    lineHeight: 20,
  },
});
