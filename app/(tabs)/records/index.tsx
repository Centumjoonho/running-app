import { useFocusEffect } from '@react-navigation/native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  ListRenderItem,
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
import { deleteRunSession, getRunSessions, type RunSession } from '@/src/lib/runs';

function RunSessionCard({
  session,
  onPress,
  onDelete,
  isDeleting,
}: {
  session: RunSession;
  onPress: () => void;
  onDelete: () => void;
  isDeleting: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={isDeleting}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
      <View style={styles.cardAccent} />
      <View style={styles.cardBody}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitles}>
            <ThemedText style={styles.cardTitle}>{formatRunTitle(session.started_at)}</ThemedText>
            <ThemedText style={styles.cardDate}>{formatRunDate(session.started_at)}</ThemedText>
          </View>
          <View style={styles.cardActions}>
            <Pressable
              onPress={onDelete}
              disabled={isDeleting}
              hitSlop={8}
              style={({ pressed }) => [
                styles.deleteButton,
                pressed && styles.deleteButtonPressed,
                isDeleting && styles.deleteButtonDisabled,
              ]}
              accessibilityRole="button"
              accessibilityLabel="러닝 기록 삭제">
              {isDeleting ? (
                <ActivityIndicator size="small" color={colors.stop} />
              ) : (
                <MaterialIcons name="delete-outline" size={22} color={colors.stop} />
              )}
            </Pressable>
            <MaterialIcons name="chevron-right" size={22} color={colors.primary} />
          </View>
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
      </View>
    </Pressable>
  );
}

function RecordsListHeader() {
  return (
    <View style={styles.header}>
      <ThemedText style={myleScreenStyles.title}>기록</ThemedText>
      <ThemedText style={myleScreenStyles.subtitle}>내가 그린 Myle 컬렉션</ThemedText>
    </View>
  );
}

function RecordsEmptyState() {
  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconWrap}>
        <MaterialIcons name="brush" size={32} color={colors.primary} />
      </View>
      <ThemedText style={styles.emptyTitle}>아직 저장된 러닝 기록이 없습니다.</ThemedText>
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
  const [deletingRunId, setDeletingRunId] = useState<string | null>(null);

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

      const { data, error: fetchError } = await getRunSessions(userId);

      setRuns(data);
      setError(fetchError);
      setIsLoading(false);
      setIsRefreshing(false);
    },
    [session?.user?.id],
  );

  const confirmDeleteRun = useCallback(
    (runId: string) => {
      Alert.alert('기록 삭제', '정말 이 러닝 기록을 삭제하시겠습니까?', [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            const userId = session?.user?.id;
            if (!userId) {
              Alert.alert('삭제 실패', '로그인 정보를 찾을 수 없습니다.');
              return;
            }

            setDeletingRunId(runId);

            const result = await deleteRunSession(runId, userId);

            setDeletingRunId(null);

            if (!result.ok) {
              Alert.alert('삭제 실패', result.error);
              return;
            }

            await loadRuns(true);
          },
        },
      ]);
    },
    [loadRuns, session?.user?.id],
  );

  useFocusEffect(
    useCallback(() => {
      loadRuns();
    }, [loadRuns]),
  );

  const renderRunItem: ListRenderItem<RunSession> = useCallback(
    ({ item }) => (
      <RunSessionCard
        session={item}
        isDeleting={deletingRunId === item.id}
        onDelete={() => confirmDeleteRun(item.id)}
        onPress={() =>
          router.push({ pathname: '/(tabs)/records/[id]', params: { id: item.id } })
        }
      />
    ),
    [confirmDeleteRun, deletingRunId, router],
  );

  if (isLoading) {
    return (
      <MyleScreen>
        <View style={styles.screen}>
          <RecordsListHeader />
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        </View>
      </MyleScreen>
    );
  }

  if (error) {
    return (
      <MyleScreen>
        <View style={styles.screen}>
          <RecordsListHeader />
          <View style={styles.centered}>
            <ThemedText style={myleScreenStyles.errorText}>{error}</ThemedText>
          </View>
        </View>
      </MyleScreen>
    );
  }

  return (
    <MyleScreen>
      <FlatList
        style={styles.list}
        data={runs}
        keyExtractor={(item) => item.id}
        renderItem={renderRunItem}
        ListHeaderComponent={RecordsListHeader}
        ListEmptyComponent={RecordsEmptyState}
        contentContainerStyle={[
          styles.listContent,
          runs.length === 0 && styles.listContentEmpty,
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => loadRuns(true)}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      />
    </MyleScreen>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xxxl,
    gap: spacing.md,
  },
  listContentEmpty: {
    flexGrow: 1,
  },
  header: {
    gap: spacing.xs,
    marginBottom: spacing.lg,
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
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  deleteButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.full,
  },
  deleteButtonPressed: {
    opacity: 0.7,
    backgroundColor: overlays.stop,
  },
  deleteButtonDisabled: {
    opacity: 0.6,
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
    paddingVertical: spacing.xxxl,
    paddingHorizontal: spacing.xxl,
    minHeight: 280,
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
