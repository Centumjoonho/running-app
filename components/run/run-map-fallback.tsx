import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { LocationDeniedMessage } from '@/components/run/location-denied-message';
import { ThemedText } from '@/components/themed-text';
import { colors, spacing } from '@/src/constants/theme';

type RunMapFallbackProps = {
  variant: 'loading' | 'denied' | 'web';
};

export function RunMapFallback({ variant }: RunMapFallbackProps) {
  return (
    <View style={styles.container}>
      {variant === 'loading' ? (
        <>
          <ActivityIndicator size="large" color={colors.primary} />
          <ThemedText style={styles.hint}>위치 정보를 가져오는 중...</ThemedText>
        </>
      ) : null}
      {variant === 'denied' ? <LocationDeniedMessage /> : null}
      {variant === 'web' ? (
        <>
          <MaterialIcons name="map" size={48} color={colors.secondary} />
          <ThemedText style={styles.hint}>지도는 iOS/Android 앱에서 사용할 수 있습니다</ThemedText>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xxl,
  },
  hint: {
    fontSize: 14,
    color: colors.mutedText,
    textAlign: 'center',
  },
});
