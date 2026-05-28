import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { MyleButton } from '@/components/ui/myle-button';
import { MyleCard } from '@/components/ui/myle-card';
import { MyleScreen, myleScreenStyles } from '@/components/ui/myle-screen';
import { colors, spacing } from '@/src/constants/theme';
import { useAuth } from '@/src/contexts/auth-context';
import { getUserAccountSubtitle, getUserDisplayLabel } from '@/src/lib/user-display';

const SETTINGS_ITEMS = [
  { label: '프로필', description: '이름, 목표 설정' },
  { label: '단위', description: 'km / mile' },
  { label: '알림', description: '러닝 리마인더' },
  { label: '앱 정보', description: 'Myle v1.0.0' },
] as const;

export default function SettingsScreen() {
  const { session, signOut } = useAuth();

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
    <MyleScreen>
      <View style={styles.content}>
        <ThemedText style={myleScreenStyles.title} lightColor={colors.text} darkColor={colors.text}>
          설정
        </ThemedText>
        <ThemedText style={myleScreenStyles.subtitle}>Myle 설정을 관리합니다</ThemedText>

        {session?.user ? (
          <MyleCard style={styles.accountBox}>
            <ThemedText style={styles.accountLabel}>로그인 계정</ThemedText>
            <ThemedText style={styles.accountEmail}>{getUserDisplayLabel(session.user)}</ThemedText>
            {getUserAccountSubtitle(session.user) ? (
              <ThemedText style={styles.accountSubtitle}>{getUserAccountSubtitle(session.user)}</ThemedText>
            ) : null}
          </MyleCard>
        ) : null}

        <MyleCard style={styles.list}>
          {SETTINGS_ITEMS.map((item, index) => (
            <View
              key={item.label}
              style={[styles.listItem, index < SETTINGS_ITEMS.length - 1 && styles.listItemBorder]}>
              <ThemedText style={styles.itemLabel}>{item.label}</ThemedText>
              <ThemedText style={styles.itemDescription}>{item.description}</ThemedText>
            </View>
          ))}
        </MyleCard>

        {error ? <ThemedText style={myleScreenStyles.errorText}>{error}</ThemedText> : null}

        <MyleButton
          label={loading ? '로그아웃 중...' : '로그아웃'}
          variant="outline"
          onPress={handleSignOut}
          disabled={loading}
          buttonStyle={styles.logoutButton}
        />
      </View>
    </MyleScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xl,
  },
  accountBox: {
    padding: spacing.lg,
    gap: spacing.xs,
    marginBottom: spacing.lg,
  },
  accountLabel: {
    fontSize: 13,
    color: colors.mutedText,
    fontWeight: '500',
  },
  accountEmail: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  accountSubtitle: {
    fontSize: 13,
    color: colors.mutedText,
  },
  list: {
    overflow: 'hidden',
  },
  listItem: {
    padding: spacing.lg,
    gap: 2,
  },
  listItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  itemLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  itemDescription: {
    fontSize: 14,
    color: colors.mutedText,
  },
  logoutButton: {
    marginTop: 'auto',
  },
});
