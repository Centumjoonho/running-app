import { StyleSheet, View, type ViewProps } from 'react-native';

import { borderRadius, colors } from '@/src/constants/theme';

type MyleCardProps = ViewProps & {
  accent?: boolean;
};

export function MyleCard({ children, style, accent = false, ...props }: MyleCardProps) {
  return (
    <View style={[styles.card, accent && styles.cardAccent, style]} {...props}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardAccent: {
    borderColor: 'rgba(53, 242, 165, 0.35)',
  },
});
