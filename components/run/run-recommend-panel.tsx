import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { MyleButton } from '@/components/ui/myle-button';
import { borderRadius, colors, overlays, spacing } from '@/src/constants/theme';
import {
  formatRouteTypeLabel,
  RUNNING_DISTANCE_OPTIONS_KM,
  type RunningDistanceKm,
  type RunningRoute,
} from '@/src/lib/runningRouteApi';

type RunRecommendPanelProps = {
  selectedDistanceKm: RunningDistanceKm;
  onSelectDistance: (distanceKm: RunningDistanceKm) => void;
  routes: RunningRoute[];
  selectedRouteIndex: number;
  onSelectRoute: (index: number) => void;
  isGenerating: boolean;
  generateError: string | null;
  onGenerate: () => void;
  onStartWithRoute: () => void;
  onStartFreeRun: () => void;
  hasValidSelectedRoute: boolean;
  canRun: boolean;
  isRunning: boolean;
  isSaving: boolean;
  buttonLabel: string;
  onStopRun: () => void;
};

function RouteCandidateCard({
  route,
  index,
  selected,
  onPress,
}: {
  route: RunningRoute;
  index: number;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.candidateCard, selected && styles.candidateCardSelected]}>
      <ThemedText style={[styles.candidateTitle, selected && styles.candidateTitleSelected]}>
        후보 {index + 1} · {formatRouteTypeLabel(route.routeType)}
      </ThemedText>
      <View style={styles.candidateStats}>
        <ThemedText style={styles.candidateStat}>거리 {route.distanceKm.toFixed(2)} km</ThemedText>
        <ThemedText style={styles.candidateStat}>시간 {route.durationMin}분</ThemedText>
        <ThemedText style={styles.candidateStat}>점수 {route.score}</ThemedText>
      </View>
    </Pressable>
  );
}

export function RunRecommendPanel({
  selectedDistanceKm,
  onSelectDistance,
  routes,
  selectedRouteIndex,
  onSelectRoute,
  isGenerating,
  generateError,
  onGenerate,
  onStartWithRoute,
  onStartFreeRun,
  hasValidSelectedRoute,
  canRun,
  isRunning,
  isSaving,
  buttonLabel,
  onStopRun,
}: RunRecommendPanelProps) {
  const selectedRoute = routes[selectedRouteIndex] ?? null;

  if (isRunning) {
    return (
      <View style={styles.panel}>
        <View style={styles.handle} />
        <ThemedText style={styles.title}>러닝 중</ThemedText>
        <ThemedText style={styles.subtitle}>당신의 길이 하나의 그림이 되고 있어요</ThemedText>

        <Pressable
          disabled={isSaving}
          onPress={onStopRun}
          style={({ pressed }) => [
            styles.button,
            styles.stopButton,
            { opacity: isSaving ? 0.6 : pressed ? 0.88 : 1 },
          ]}>
          {isSaving ? (
            <ActivityIndicator color={colors.background} />
          ) : (
            <ThemedText style={[styles.buttonText, styles.stopButtonText]}>{buttonLabel}</ThemedText>
          )}
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.panel}>
      <View style={styles.handle} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        <ThemedText style={styles.title}>추천 러닝 코스</ThemedText>
        <ThemedText style={styles.subtitle}>
          현재 위치 기준으로 달리기 좋은 코스를 추천해드려요.
        </ThemedText>

        <View style={styles.section}>
          <ThemedText style={styles.sectionLabel}>목표 거리</ThemedText>
          <View style={styles.distanceRow}>
            {RUNNING_DISTANCE_OPTIONS_KM.map((distanceKm) => {
              const selected = selectedDistanceKm === distanceKm;

              return (
                <Pressable
                  key={distanceKm}
                  onPress={() => onSelectDistance(distanceKm)}
                  style={[styles.distanceChip, selected && styles.distanceChipSelected]}>
                  <ThemedText
                    style={[styles.distanceChipText, selected && styles.distanceChipTextSelected]}>
                    {distanceKm}km
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        </View>

        <MyleButton
          label="추천 코스 만들기"
          onPress={onGenerate}
          loading={isGenerating}
          disabled={!canRun || isGenerating}
        />

        {isGenerating ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color={colors.primary} />
            <ThemedText style={styles.loadingText}>코스를 생성하는 중입니다...</ThemedText>
          </View>
        ) : null}

        {generateError ? (
          <ThemedText style={styles.errorText}>{generateError}</ThemedText>
        ) : null}

        {hasValidSelectedRoute && selectedRoute ? (
          <View style={styles.section}>
            <ThemedText style={styles.sectionLabel}>생성 결과</ThemedText>
            <View style={styles.resultStats}>
              <View style={styles.resultStatItem}>
                <ThemedText style={styles.resultStatLabel}>예상 거리</ThemedText>
                <ThemedText style={styles.resultStatValue}>
                  {selectedRoute.distanceKm.toFixed(2)} km
                </ThemedText>
              </View>
              <View style={styles.resultStatItem}>
                <ThemedText style={styles.resultStatLabel}>예상 시간</ThemedText>
                <ThemedText style={styles.resultStatValue}>{selectedRoute.durationMin}분</ThemedText>
              </View>
              <View style={styles.resultStatItem}>
                <ThemedText style={styles.resultStatLabel}>추천 점수</ThemedText>
                <ThemedText style={styles.resultStatValue}>{selectedRoute.score}</ThemedText>
              </View>
            </View>
          </View>
        ) : null}

        {routes.length > 0 ? (
          <View style={styles.section}>
            <ThemedText style={styles.sectionLabel}>코스 후보</ThemedText>
            {routes.map((route, index) => (
              <RouteCandidateCard
                key={`${route.routeType}-${route.distanceKm}-${index}`}
                route={route}
                index={index}
                selected={selectedRouteIndex === index}
                onPress={() => onSelectRoute(index)}
              />
            ))}
          </View>
        ) : null}

        <MyleButton
          label="이 코스로 러닝 시작"
          onPress={onStartWithRoute}
          disabled={!hasValidSelectedRoute || !canRun || isGenerating}
        />

        <MyleButton
          label="그냥 자유 러닝 시작"
          variant="outline"
          onPress={onStartFreeRun}
          disabled={!canRun}
        />
      </ScrollView>
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
    borderTopWidth: 1,
    borderColor: overlays.primaryBorder,
    maxHeight: '52%',
  },
  scroll: {
    flexGrow: 0,
  },
  scrollContent: {
    gap: spacing.md,
    paddingBottom: spacing.sm,
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
    lineHeight: 20,
  },
  section: {
    gap: spacing.sm,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  distanceRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  distanceChip: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  distanceChipSelected: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(53, 242, 165, 0.08)',
  },
  distanceChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.mutedText,
  },
  distanceChipTextSelected: {
    color: colors.primary,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  loadingText: {
    fontSize: 13,
    color: colors.mutedText,
  },
  errorText: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.stop,
    textAlign: 'center',
  },
  resultStats: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  resultStatItem: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.background,
  },
  resultStatLabel: {
    fontSize: 11,
    color: colors.mutedText,
    fontWeight: '500',
  },
  resultStatValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  candidateCard: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    gap: spacing.xs,
  },
  candidateCardSelected: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(53, 242, 165, 0.08)',
  },
  candidateTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  candidateTitleSelected: {
    color: colors.primary,
  },
  candidateStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  candidateStat: {
    fontSize: 12,
    color: colors.mutedText,
  },
  button: {
    height: 56,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xs,
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
