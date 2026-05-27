import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { usePathname, useRouter } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { MyleButton } from '@/components/ui/myle-button';
import { MyleInput } from '@/components/ui/myle-input';
import { MyleScreen, myleScreenStyles } from '@/components/ui/myle-screen';
import { colors, spacing } from '@/src/constants/theme';
import { useAuth } from '@/src/contexts/auth-context';

export default function LoginScreen() {
  const router = useRouter();
  const pathname = usePathname();
  const { session, isLoading, signIn, signUp } = useAuth();
  const didRedirectRef = useRef(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    console.log('[AuthFlow] login 화면 진입');
  }, []);

  useEffect(() => {
    if (isLoading || !session || didRedirectRef.current || pathname === '/(tabs)') {
      return;
    }

    didRedirectRef.current = true;
    console.log('[AuthFlow] redirect target: /(tabs)');
    router.replace('/(tabs)');
  }, [isLoading, pathname, router, session]);

  if (isLoading) {
    return (
      <MyleScreen edges={['top', 'bottom']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </MyleScreen>
    );
  }

  const handleSignIn = async () => {
    setError(null);
    setMessage(null);

    if (!email.trim() || !password) {
      setError('이메일과 비밀번호를 입력해주세요.');
      return;
    }

    setLoading(true);
    const result = await signIn(email.trim(), password);
    setLoading(false);

    if (result.error) {
      setError(result.error);
    }
  };

  const handleSignUp = async () => {
    setError(null);
    setMessage(null);

    if (!email.trim() || !password) {
      setError('이메일과 비밀번호를 입력해주세요.');
      return;
    }

    if (password.length < 6) {
      setError('비밀번호는 6자 이상이어야 합니다.');
      return;
    }

    setLoading(true);
    const result = await signUp(email.trim(), password);
    setLoading(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setMessage(result.message);
  };

  return (
    <MyleScreen edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <ThemedText style={styles.brandTitle} lightColor={colors.text} darkColor={colors.text}>
            Myle
          </ThemedText>
          <ThemedText style={styles.brandSubtitle}>Myle 계정으로 로그인하세요</ThemedText>

          <View style={styles.form}>
            <ThemedText style={styles.label} lightColor={colors.mutedText} darkColor={colors.mutedText}>
              이메일
            </ThemedText>
            <MyleInput
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="emailAddress"
              editable={!loading}
            />

            <ThemedText style={styles.label} lightColor={colors.mutedText} darkColor={colors.mutedText}>
              비밀번호
            </ThemedText>
            <MyleInput
              value={password}
              onChangeText={setPassword}
              placeholder="비밀번호"
              secureTextEntry
              textContentType="password"
              editable={!loading}
            />

            {error ? <ThemedText style={myleScreenStyles.errorText}>{error}</ThemedText> : null}
            {message ? <ThemedText style={myleScreenStyles.successText}>{message}</ThemedText> : null}

            <MyleButton
              label="로그인"
              onPress={handleSignIn}
              loading={loading}
              buttonStyle={styles.primaryButton}
            />

            <MyleButton
              label="회원가입"
              variant="outline"
              onPress={handleSignUp}
              disabled={loading}
              buttonStyle={styles.secondaryButton}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </MyleScreen>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.xxxl,
    justifyContent: 'center',
    gap: spacing.sm,
  },
  brandTitle: {
    fontSize: 36,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  brandSubtitle: {
    fontSize: 15,
    color: colors.mutedText,
    textAlign: 'center',
    marginBottom: spacing.xxl,
  },
  form: {
    gap: spacing.sm,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: spacing.sm,
  },
  primaryButton: {
    marginTop: spacing.lg,
  },
  secondaryButton: {
    marginTop: spacing.sm,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
