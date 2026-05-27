import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { colors, spacing } from '@/src/constants/theme';

export function LocationDeniedMessage() {
  return (
    <>
      <MaterialIcons name="location-off" size={48} color={colors.mutedText} />
      <ThemedText style={styles.title}>위치 권한이 필요합니다</ThemedText>
      <ThemedText style={styles.message}>
        러닝 기록을 위해 기기 설정에서 위치 권한을 허용해 주세요.
      </ThemedText>
    </>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: spacing.xs,
    color: colors.text,
  },
  message: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    color: colors.mutedText,
  },
});
