import { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/src/contexts/auth-context';

const SETTINGS_ITEMS = [
  { label: '프로필', description: '이름, 목표 설정' },
  { label: '단위', description: 'km / mile' },
  { label: '알림', description: '러닝 리마인더' },
  { label: '앱 정보', description: 'Myle v1.0.0' },
] as const;

export default function SettingsScreen() {
  const { session, signOut } = useAuth();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSignOut = async () => {
    setError(null);
    setLoading(true);

    const result = await signOut();
    setLoading(false);

    if (result.error) {
      setError(result.error);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.content}>
        <ThemedText type="title">설정</ThemedText>
        <ThemedText style={styles.subtitle}>앱 설정을 관리합니다</ThemedText>

        {session?.user.email ? (
          <ThemedView style={styles.accountBox}>
            <ThemedText style={styles.accountLabel}>로그인 계정</ThemedText>
            <ThemedText type="defaultSemiBold">{session.user.email}</ThemedText>
          </ThemedView>
        ) : null}

        <ThemedView style={styles.list}>
          {SETTINGS_ITEMS.map((item) => (
            <ThemedView key={item.label} style={styles.listItem}>
              <ThemedText type="defaultSemiBold">{item.label}</ThemedText>
              <ThemedText style={styles.itemDescription}>{item.description}</ThemedText>
            </ThemedView>
          ))}
        </ThemedView>

        {error ? (
          <ThemedText style={styles.errorText} lightColor="#D32F2F" darkColor="#EF5350">
            {error}
          </ThemedText>
        ) : null}

        <Pressable
          style={({ pressed }) => [
            styles.logoutButton,
            { borderColor: theme.tint, opacity: pressed || loading ? 0.85 : 1 },
          ]}
          onPress={handleSignOut}
          disabled={loading}>
          <ThemedText style={[styles.logoutButtonText, { color: theme.tint }]}>
            {loading ? '로그아웃 중...' : '로그아웃'}
          </ThemedText>
        </Pressable>
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
    marginBottom: 16,
    opacity: 0.7,
  },
  accountBox: {
    padding: 16,
    borderRadius: 12,
    gap: 4,
    marginBottom: 8,
  },
  accountLabel: {
    fontSize: 13,
    opacity: 0.6,
  },
  list: {
    gap: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  listItem: {
    padding: 16,
    gap: 2,
  },
  itemDescription: {
    fontSize: 14,
    opacity: 0.5,
  },
  errorText: {
    fontSize: 14,
    lineHeight: 20,
  },
  logoutButton: {
    marginTop: 'auto',
    height: 52,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutButtonText: {
    fontSize: 17,
    fontWeight: '600',
  },
});
