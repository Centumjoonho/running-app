import { useFocusEffect } from '@react-navigation/native';
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
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/src/contexts/auth-context';
import {
  formatDistanceKm,
  formatDuration,
  formatPaceSeconds,
  formatRunDate,
} from '@/src/lib/format';
import { fetchRunSessions, type RunSession } from '@/src/lib/runs';

function RunSessionCard({
  session,
  cardBackground,
  onPress,
}: {
  session: RunSession;
  cardBackground: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, { backgroundColor: cardBackground, opacity: pressed ? 0.85 : 1 }]}>
      <ThemedText type="defaultSemiBold">{formatRunDate(session.started_at)}</ThemedText>
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <ThemedText style={styles.statLabel}>거리</ThemedText>
          <ThemedText style={styles.statValue}>{formatDistanceKm(session.distance_m)} km</ThemedText>
        </View>
        <View style={styles.statItem}>
          <ThemedText style={styles.statLabel}>시간</ThemedText>
          <ThemedText style={styles.statValue}>{formatDuration(session.duration_seconds)}</ThemedText>
        </View>
        <View style={styles.statItem}>
          <ThemedText style={styles.statLabel}>페이스</ThemedText>
          <ThemedText style={styles.statValue}>
            {formatPaceSeconds(session.avg_pace_seconds_per_km)} /km
          </ThemedText>
        </View>
      </View>
    </Pressable>
  );
}

export default function RecordsScreen() {
  const { session } = useAuth();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const cardBackground = colorScheme === 'dark' ? '#1C1C1E' : '#F2F2F7';

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
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.content}>
        <ThemedText type="title">기록</ThemedText>
        <ThemedText style={styles.subtitle}>나의 러닝 기록</ThemedText>

        {isLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={theme.tint} />
          </View>
        ) : error ? (
          <View style={styles.centered}>
            <ThemedText style={styles.errorText}>{error}</ThemedText>
          </View>
        ) : runs.length === 0 ? (
          <View style={styles.centered}>
            <ThemedText type="defaultSemiBold">기록이 없습니다</ThemedText>
            <ThemedText style={styles.hint}>러닝을 시작하면 여기에 기록이 표시됩니다</ThemedText>
          </View>
        ) : (
          <FlatList
            data={runs}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl refreshing={isRefreshing} onRefresh={() => loadRuns(true)} />
            }
            renderItem={({ item }) => (
              <RunSessionCard
                session={item}
                cardBackground={cardBackground}
                onPress={() => router.push(`/(tabs)/records/${item.id}`)}
              />
            )}
          />
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
    gap: 8,
  },
  subtitle: {
    marginBottom: 8,
    opacity: 0.7,
  },
  listContent: {
    gap: 12,
    paddingBottom: 24,
  },
  card: {
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statItem: {
    flex: 1,
    gap: 2,
  },
  statLabel: {
    fontSize: 12,
    opacity: 0.6,
  },
  statValue: {
    fontSize: 15,
    fontWeight: '600',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingBottom: 80,
  },
  hint: {
    opacity: 0.5,
    fontSize: 14,
    textAlign: 'center',
  },
  errorText: {
    color: '#FF3B30',
    textAlign: 'center',
  },
});
