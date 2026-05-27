import { useEffect } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { colors, overlays, spacing } from '@/src/constants/theme';

const SCREEN_WIDTH = Dimensions.get('window').width;
const TRACK_WIDTH = SCREEN_WIDTH - spacing.xxxl * 2;

const LOGO_DURATION = 680;
const TAGLINE_DELAY = 420;
const TAGLINE_DURATION = 520;
const ROUTE_DELAY = 240;
const ROUTE_DURATION = 1600;
const CAPTION_DELAY = 780;
const CAPTION_DURATION = 460;

export function IntroRouteAnimation() {
  const progress = useSharedValue(0);
  const runnerBounce = useSharedValue(0);
  const trailPulse = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      ROUTE_DELAY,
      withTiming(1, {
        duration: ROUTE_DURATION,
        easing: Easing.bezier(0.18, 0.85, 0.22, 1),
      }),
    );

    runnerBounce.value = withDelay(
      ROUTE_DELAY,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 130, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: 130, easing: Easing.in(Easing.quad) }),
        ),
        -1,
        false,
      ),
    );

    trailPulse.value = withDelay(
      ROUTE_DELAY,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 420, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.25, { duration: 420, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        true,
      ),
    );
  }, [progress, runnerBounce, trailPulse]);

  const lineStyle = useAnimatedStyle(() => ({
    width: TRACK_WIDTH * progress.value,
    opacity: interpolate(progress.value, [0, 0.04, 1], [0, 1, 1]),
  }));

  const glowStyle = useAnimatedStyle(() => ({
    width: TRACK_WIDTH * progress.value,
    opacity: interpolate(progress.value, [0, 0.08, 1], [0, 0.65, 1]),
  }));

  const secondaryGlowStyle = useAnimatedStyle(() => ({
    width: Math.max(TRACK_WIDTH * progress.value - 24, 0),
    opacity: interpolate(progress.value, [0, 0.15, 1], [0, 0.35, 0.55]) * trailPulse.value,
  }));

  const dotStyle = useAnimatedStyle(() => {
    const bounceY = interpolate(runnerBounce.value, [0, 1], [0, -9]);
    return {
      transform: [
        { translateX: TRACK_WIDTH * progress.value - 7 },
        { translateY: bounceY },
      ],
      opacity: interpolate(progress.value, [0, 0.05, 1], [0, 1, 1]),
    };
  });

  const dotGlowStyle = useAnimatedStyle(() => {
    const bounceY = interpolate(runnerBounce.value, [0, 1], [0, -9]);
    return {
      transform: [
        { translateX: TRACK_WIDTH * progress.value - 16 },
        { translateY: bounceY },
        { scale: 0.9 + trailPulse.value * 0.25 },
      ],
      opacity: interpolate(progress.value, [0, 0.05, 1], [0, 0.75, 1]),
    };
  });

  const blueTrailStyle = useAnimatedStyle(() => {
    const bounceY = interpolate(runnerBounce.value, [0, 1], [0, -9]);
    return {
      transform: [
        { translateX: TRACK_WIDTH * progress.value - 36 },
        { translateY: bounceY + 2 },
        { scaleX: 0.6 + trailPulse.value * 0.5 },
      ],
      opacity: interpolate(progress.value, [0, 0.1, 1], [0, 0.5, 0.7]) * trailPulse.value,
    };
  });

  const speedLine1Style = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0.2, 0.45, 0.9], [0, 0.45, 0]) * trailPulse.value,
    transform: [
      { translateX: TRACK_WIDTH * progress.value * 0.35 - 40 },
      { scaleX: 0.8 + trailPulse.value * 0.4 },
    ],
  }));

  const speedLine2Style = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0.35, 0.6, 1], [0, 0.35, 0]) * trailPulse.value,
    transform: [
      { translateX: TRACK_WIDTH * progress.value * 0.62 - 30 },
      { scaleX: 0.7 + trailPulse.value * 0.35 },
    ],
  }));

  return (
    <View style={[styles.routeWrap, { width: TRACK_WIDTH }]}>
      <Animated.View style={[styles.speedLine, speedLine1Style]} />
      <Animated.View style={[styles.speedLine, styles.speedLineShort, speedLine2Style]} />

      <View style={[styles.track, { width: TRACK_WIDTH }]}>
        <Animated.View style={[styles.trackSecondaryGlow, secondaryGlowStyle]} />
        <Animated.View style={[styles.trackGlow, glowStyle]} />
        <Animated.View style={[styles.trackLine, lineStyle]} />
      </View>

      <Animated.View style={[styles.blueTrail, blueTrailStyle]} />
      <Animated.View style={[styles.dotGlow, dotGlowStyle]} />
      <Animated.View style={[styles.dot, dotStyle]} />
    </View>
  );
}

type IntroSplashProps = {
  showTagline?: boolean;
};

export function IntroSplash({ showTagline = true }: IntroSplashProps) {
  const insets = useSafeAreaInsets();
  const logoProgress = useSharedValue(0);
  const taglineOpacity = useSharedValue(0);
  const captionOpacity = useSharedValue(0);

  useEffect(() => {
    logoProgress.value = withTiming(1, {
      duration: LOGO_DURATION,
      easing: Easing.out(Easing.cubic),
    });

    taglineOpacity.value = withDelay(
      TAGLINE_DELAY,
      withTiming(1, {
        duration: TAGLINE_DURATION,
        easing: Easing.out(Easing.cubic),
      }),
    );

    captionOpacity.value = withDelay(
      CAPTION_DELAY,
      withTiming(1, {
        duration: CAPTION_DURATION,
        easing: Easing.out(Easing.quad),
      }),
    );
  }, [logoProgress, taglineOpacity, captionOpacity]);

  const logoStyle = useAnimatedStyle(() => ({
    opacity: interpolate(logoProgress.value, [0, 1], [0, 1]),
    transform: [{ scale: interpolate(logoProgress.value, [0, 1], [0.68, 1]) }],
  }));

  const taglineStyle = useAnimatedStyle(() => ({
    opacity: taglineOpacity.value,
    transform: [{ translateY: interpolate(taglineOpacity.value, [0, 1], [10, 0]) }],
  }));

  const captionStyle = useAnimatedStyle(() => ({
    opacity: captionOpacity.value,
    transform: [{ translateY: interpolate(captionOpacity.value, [0, 1], [8, 0]) }],
  }));

  return (
    <View style={[styles.screen, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.hero}>
        <Animated.View style={[styles.logoWrap, logoStyle]}>
          <ThemedText style={styles.logo} lightColor={colors.text} darkColor={colors.text}>
            Myle
          </ThemedText>
        </Animated.View>

        {showTagline ? (
          <Animated.View style={taglineStyle}>
            <ThemedText style={styles.tagline} lightColor={colors.text} darkColor={colors.text}>
              Draw your run.
            </ThemedText>
          </Animated.View>
        ) : null}
      </View>

      <View style={styles.bottom}>
        <IntroRouteAnimation />
        <Animated.View style={captionStyle}>
          <ThemedText style={styles.caption} lightColor={colors.secondary} darkColor={colors.secondary}>
            내가 달리는 길이 하나의 그림이 됩니다
          </ThemedText>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'space-between',
  },
  hero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxxl,
    gap: spacing.md,
  },
  logoWrap: {
    alignItems: 'center',
  },
  logo: {
    fontSize: 56,
    lineHeight: 64,
    fontWeight: '800',
    letterSpacing: -1.2,
    color: colors.text,
  },
  tagline: {
    fontSize: 17,
    lineHeight: 26,
    color: colors.text,
    letterSpacing: 0.4,
    fontWeight: '500',
    opacity: 0.92,
  },
  bottom: {
    alignItems: 'center',
    paddingHorizontal: spacing.xxxl,
    paddingBottom: spacing.xxxl,
    gap: spacing.xl,
  },
  caption: {
    fontSize: 13,
    lineHeight: 20,
    color: colors.secondary,
    textAlign: 'center',
    opacity: 0.9,
  },
  routeWrap: {
    height: 40,
    justifyContent: 'center',
  },
  track: {
    height: 4,
    borderRadius: 999,
    backgroundColor: colors.border,
    overflow: 'visible',
    justifyContent: 'center',
  },
  trackSecondaryGlow: {
    position: 'absolute',
    left: 0,
    height: 14,
    top: -5,
    borderRadius: 999,
    backgroundColor: overlays.secondaryGlow,
  },
  trackGlow: {
    position: 'absolute',
    left: 0,
    height: 12,
    top: -4,
    borderRadius: 999,
    backgroundColor: overlays.routeGlow,
  },
  trackLine: {
    position: 'absolute',
    left: 0,
    height: 4,
    borderRadius: 999,
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 5,
  },
  speedLine: {
    position: 'absolute',
    top: 14,
    left: 0,
    width: 56,
    height: 2,
    borderRadius: 999,
    backgroundColor: colors.primary,
    opacity: 0.35,
  },
  speedLineShort: {
    width: 36,
    top: 22,
    opacity: 0.25,
  },
  blueTrail: {
    position: 'absolute',
    top: 12,
    left: 0,
    width: 32,
    height: 8,
    borderRadius: 999,
    backgroundColor: colors.secondary,
    opacity: 0.45,
    shadowColor: colors.secondary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 12,
    elevation: 4,
  },
  dot: {
    position: 'absolute',
    top: 13,
    left: 0,
    width: 14,
    height: 14,
    borderRadius: 999,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.text,
    zIndex: 3,
  },
  dotGlow: {
    position: 'absolute',
    top: 5,
    left: 0,
    width: 32,
    height: 32,
    borderRadius: 999,
    backgroundColor: overlays.primaryBorderActive,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 18,
    elevation: 8,
    zIndex: 2,
  },
});
