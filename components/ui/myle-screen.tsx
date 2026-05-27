import { StyleSheet, View, type ViewProps } from 'react-native';
import { SafeAreaView, type SafeAreaViewProps } from 'react-native-safe-area-context';

import { ThemedView } from '@/components/themed-view';
import { colors, spacing } from '@/src/constants/theme';

type MyleScreenProps = ViewProps & {
  edges?: SafeAreaViewProps['edges'];
  safe?: boolean;
};

export function MyleScreen({ children, style, edges, safe = true, ...props }: MyleScreenProps) {
  const content = safe ? (
    <SafeAreaView style={[styles.safe, style]} edges={edges ?? ['top']}>
      {children}
    </SafeAreaView>
  ) : (
    <View style={[styles.safe, style]} {...props}>
      {children}
    </View>
  );

  return (
    <ThemedView style={styles.screen} darkColor={colors.background} lightColor={colors.background}>
      {content}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  safe: {
    flex: 1,
  },
});

export const myleScreenStyles = StyleSheet.create({
  content: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xxxl,
    gap: spacing.lg,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: colors.mutedText,
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
  },
  errorText: {
    color: colors.stop,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  successText: {
    color: colors.primary,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
