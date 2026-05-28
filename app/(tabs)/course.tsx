import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GlowingLocationMarker } from '@/components/run/glowing-marker';
import { RunMapFallback } from '@/components/run/run-map-fallback';
import { RunRoutePolylines } from '@/components/run/run-route-polylines';
import { ThemedText } from '@/components/themed-text';
import { MyleButton } from '@/components/ui/myle-button';
import { MyleCard } from '@/components/ui/myle-card';
import { MyleScreen, myleScreenStyles } from '@/components/ui/myle-screen';
import { borderRadius, colors, darkMapStyle, runMap, spacing } from '@/src/constants/theme';
import { usePlannedCourse } from '@/src/contexts/planned-course-context';
import {
  COURSE_DISTANCE_OPTIONS_KM,
  COURSE_SHAPE_OPTIONS,
  type CourseDistanceKm,
  type CourseShape,
} from '@/src/lib/courseTemplates';
import { generateCourse, type GeneratedCourse } from '@/src/lib/courseGenerator';
import { getMapRegionFromCoordinates } from '@/src/lib/geo';

type LocationState =
  | { status: 'loading' }
  | { status: 'granted'; latitude: number; longitude: number }
  | { status: 'denied' };

export default function CourseScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);
  const { setPlannedCourse } = usePlannedCourse();

  const [locationState, setLocationState] = useState<LocationState>({ status: 'loading' });
  const [selectedShape, setSelectedShape] = useState<CourseShape>('heart');
  const [selectedDistanceKm, setSelectedDistanceKm] = useState<CourseDistanceKm>(5);
  const [generatedCourse, setGeneratedCourse] = useState<GeneratedCourse | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function requestLocation() {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (!isMounted) return;

      if (status !== 'granted') {
        setLocationState({ status: 'denied' });
        return;
      }

      try {
        const position = await Location.getCurrentPositionAsync({});
        if (!isMounted) return;

        setLocationState({
          status: 'granted',
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      } catch {
        if (isMounted) {
          setLocationState({ status: 'denied' });
        }
      }
    }

    requestLocation();

    return () => {
      isMounted = false;
    };
  }, []);

  const fitMapToCourse = useCallback((course: GeneratedCourse) => {
    if (Platform.OS === 'web') return;

    const region = getMapRegionFromCoordinates(course.coordinates, 0.008);
    if (!region) return;

    mapRef.current?.animateToRegion(region, 450);
  }, []);

  const handleGenerateCourse = async () => {
    if (locationState.status !== 'granted') return;

    setIsGenerating(true);

    try {
      const position = await Location.getCurrentPositionAsync({});
      const center = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };

      setLocationState({
        status: 'granted',
        ...center,
      });

      const course = generateCourse(
        center.latitude,
        center.longitude,
        selectedShape,
        selectedDistanceKm,
      );

      setGeneratedCourse(course);
      fitMapToCourse(course);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleStartRunWithCourse = () => {
    if (!generatedCourse) return;

    setPlannedCourse(generatedCourse);
    router.push('/(tabs)/run');
  };

  const showMap = locationState.status === 'granted' && Platform.OS !== 'web';
  const previewCoordinates = generatedCourse?.coordinates ?? [];

  return (
    <MyleScreen>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + spacing.xxxl },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <ThemedText style={myleScreenStyles.title} lightColor={colors.text} darkColor={colors.text}>
            그림 코스 만들기
          </ThemedText>
          <ThemedText style={myleScreenStyles.subtitle}>
            현재 위치 주변에 재미있는 러닝 코스를 만들어보세요.
          </ThemedText>
        </View>

        {locationState.status === 'denied' ? (
          <MyleCard style={styles.noticeCard}>
            <ThemedText style={styles.noticeText}>
              위치 권한이 필요합니다. 설정에서 Myle의 위치 접근을 허용한 뒤 다시 시도해주세요.
            </ThemedText>
          </MyleCard>
        ) : null}

        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>도형 선택</ThemedText>
          <View style={styles.optionRow}>
            {COURSE_SHAPE_OPTIONS.map((shape) => {
              const selected = selectedShape === shape.id;

              return (
                <Pressable
                  key={shape.id}
                  onPress={() => setSelectedShape(shape.id)}
                  style={[styles.shapeCard, selected && styles.shapeCardSelected]}>
                  <ThemedText style={[styles.shapeLabel, selected && styles.shapeLabelSelected]}>
                    {shape.label}
                  </ThemedText>
                  <ThemedText style={styles.shapeDescription}>{shape.description}</ThemedText>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>목표 거리</ThemedText>
          <View style={styles.distanceRow}>
            {COURSE_DISTANCE_OPTIONS_KM.map((distanceKm) => {
              const selected = selectedDistanceKm === distanceKm;

              return (
                <Pressable
                  key={distanceKm}
                  onPress={() => setSelectedDistanceKm(distanceKm)}
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
          label={isGenerating ? '코스 생성 중...' : '코스 생성하기'}
          onPress={handleGenerateCourse}
          loading={isGenerating}
          disabled={locationState.status !== 'granted' || isGenerating}
        />

        <View style={styles.section}>
          <View style={styles.previewHeader}>
            <ThemedText style={styles.sectionTitle}>지도 미리보기</ThemedText>
            {generatedCourse ? (
              <ThemedText style={styles.estimatedDistance}>
                예상 거리 {generatedCourse.estimatedDistanceKm.toFixed(2)} km
              </ThemedText>
            ) : null}
          </View>

          <View style={styles.mapContainer}>
            {locationState.status === 'loading' ? (
              <RunMapFallback variant="loading" />
            ) : locationState.status === 'denied' ? (
              <RunMapFallback variant="denied" />
            ) : Platform.OS === 'web' ? (
              <RunMapFallback variant="web" />
            ) : (
              <MapView
                ref={mapRef}
                style={styles.map}
                customMapStyle={darkMapStyle}
                userInterfaceStyle="dark"
                showsCompass={false}
                showsScale={false}
                showsPointsOfInterest={false}
                toolbarEnabled={false}
                initialRegion={{
                  latitude: locationState.latitude,
                  longitude: locationState.longitude,
                  latitudeDelta: runMap.regionDelta,
                  longitudeDelta: runMap.regionDelta,
                }}>
                {previewCoordinates.length >= 2 ? (
                  <RunRoutePolylines coordinates={previewCoordinates} />
                ) : null}
                <Marker
                  coordinate={{
                    latitude: locationState.latitude,
                    longitude: locationState.longitude,
                  }}
                  anchor={{ x: 0.5, y: 0.5 }}
                  tracksViewChanges={false}>
                  <GlowingLocationMarker />
                </Marker>
              </MapView>
            )}
          </View>
        </View>

        <MyleButton
          label="이 코스로 러닝 시작"
          variant="outline"
          onPress={handleStartRunWithCourse}
          disabled={!generatedCourse || locationState.status !== 'granted'}
        />
      </ScrollView>
    </MyleScreen>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    gap: spacing.lg,
  },
  header: {
    gap: spacing.xs,
  },
  noticeCard: {
    padding: spacing.lg,
  },
  noticeText: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.mutedText,
  },
  section: {
    gap: spacing.md,
  },
  sectionTitle: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '700',
    color: colors.text,
  },
  optionRow: {
    gap: spacing.sm,
  },
  shapeCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  shapeCardSelected: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(53, 242, 165, 0.08)',
  },
  shapeLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  shapeLabelSelected: {
    color: colors.primary,
  },
  shapeDescription: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.mutedText,
  },
  distanceRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  distanceChip: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  distanceChipSelected: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(53, 242, 165, 0.08)',
  },
  distanceChipText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.mutedText,
  },
  distanceChipTextSelected: {
    color: colors.primary,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  estimatedDistance: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.secondary,
  },
  mapContainer: {
    height: 280,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  map: {
    width: '100%',
    height: '100%',
  },
});
