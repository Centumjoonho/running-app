import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { borderRadius, colors, spacing } from '@/src/constants/theme';

type MyleButtonVariant = 'primary' | 'outline' | 'ghost';

type MyleButtonProps = Omit<PressableProps, 'children' | 'style'> & {
  label: string;
  variant?: MyleButtonVariant;
  loading?: boolean;
  buttonStyle?: StyleProp<ViewStyle>;
};

export function MyleButton({
  label,
  variant = 'primary',
  loading = false,
  disabled,
  buttonStyle,
  ...props
}: MyleButtonProps) {
  const isPrimary = variant === 'primary';
  const isOutline = variant === 'outline';

  return (
    <Pressable
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        isPrimary && styles.primary,
        isOutline && styles.outline,
        variant === 'ghost' && styles.ghost,
        {
          opacity: disabled || loading ? 0.5 : pressed ? 0.88 : 1,
        },
        buttonStyle,
      ]}
      {...props}>
      {loading ? (
        <ActivityIndicator color={isPrimary ? colors.background : colors.primary} />
      ) : (
        <ThemedText
          style={[styles.label, isPrimary && styles.primaryLabel, isOutline && styles.outlineLabel]}
          lightColor={isPrimary ? colors.background : isOutline ? colors.primary : colors.text}
          darkColor={isPrimary ? colors.background : isOutline ? colors.primary : colors.text}>
          {label}
        </ThemedText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 52,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  primary: {
    backgroundColor: colors.primary,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  ghost: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.border,
  },
  label: {
    fontSize: 17,
    fontWeight: '600',
  },
  primaryLabel: {
    fontWeight: '700',
  },
  outlineLabel: {
    fontWeight: '600',
  },
});
