import { StyleSheet, TextInput, type TextInputProps } from 'react-native';

import { borderRadius, colors, spacing } from '@/src/constants/theme';

export function MyleInput(props: TextInputProps) {
  return (
    <TextInput
      placeholderTextColor={colors.mutedText}
      {...props}
      style={[styles.input, props.style]}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.md,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.background,
  },
});
