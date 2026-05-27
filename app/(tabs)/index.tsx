import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function HomeScreen() {
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.content}>
        <ThemedText type="title">Myle</ThemedText>
        <ThemedText style={styles.subtitle}>오늘도 달려볼까요?</ThemedText>

        <ThemedView style={styles.card}>
          <ThemedText type="defaultSemiBold">이번 주</ThemedText>
          <ThemedText style={styles.stat}>0 km</ThemedText>
          <ThemedText style={styles.hint}>아직 기록이 없습니다</ThemedText>
        </ThemedView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 24,
    gap: 8,
  },
  subtitle: {
    marginBottom: 24,
    opacity: 0.7,
  },
  card: {
    padding: 20,
    borderRadius: 12,
    gap: 4,
  },
  stat: {
    fontSize: 36,
    fontWeight: 'bold',
    lineHeight: 44,
  },
  hint: {
    opacity: 0.5,
    fontSize: 14,
  },
});
