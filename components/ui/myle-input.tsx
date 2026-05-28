import { StyleSheet, TextInput, type TextInputProps } from 'react-native';

import { borderRadius, colors, spacing } from '@/src/constants/theme';

const PLACEHOLDER_COLOR = 'rgba(156, 163, 175, 0.85)';

export function MyleInput(props: TextInputProps) {
  return (
    <TextInput
      placeholderTextColor={PLACEHOLDER_COLOR}
      {...props}
      style={[styles.input, props.style]}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    height: 52,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.lg,
    fontSize: 16,
    lineHeight: 22,
    color: colors.text,
    backgroundColor: colors.card,
  },
});
