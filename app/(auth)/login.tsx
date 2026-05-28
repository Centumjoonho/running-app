import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { MyleButton } from '@/components/ui/myle-button';
import { MyleInput } from '@/components/ui/myle-input';
import { MyleScreen, myleScreenStyles } from '@/components/ui/myle-screen';
import { SocialAuthButton } from '@/components/ui/social-auth-button';
import { borderRadius, colors, spacing } from '@/src/constants/theme';
import { useAuth } from '@/src/contexts/auth-context';
import {
  getOAuthDebugInfo,
  getOAuthRedirectUri,
  logOAuthRedirectConfig,
  signInWithSocialProvider,
  type SocialAuthProvider,
} from '@/src/lib/oauth';

export default function LoginScreen() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { session, isLoading, signIn, signUp } = useAuth();
  const didRedirectRef = useRef(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<SocialAuthProvider | null>(null);
  const [showEmailLogin, setShowEmailLogin] = useState(false);

  const isBusy = loading || socialLoading !== null;

  useEffect(() => {
    if (__DEV__) {
      console.log('[AuthFlow] login 화면 진입');
      logOAuthRedirectConfig();
    }
  }, []);

  useEffect(() => {
    if (isLoading || !session || didRedirectRef.current || pathname === '/(tabs)') {
      return;
    }

    didRedirectRef.current = true;
    if (__DEV__) {
      console.log('[AuthFlow] redirect target: /(tabs)');
    }
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

  const handleSocialSignIn = async (provider: SocialAuthProvider) => {
    setError(null);
    setMessage(null);
    setSocialLoading(provider);

    const result = await signInWithSocialProvider(provider);

    setSocialLoading(null);

    if (result.error) {
      setError(result.error);
    }
  };

  const toggleEmailLogin = () => {
    setShowEmailLogin((prev) => !prev);
  };

  const scrollPadding = {
    paddingTop: insets.top + spacing.lg,
    paddingBottom: insets.bottom + spacing.xxxl,
  };

  return (
    <MyleScreen edges={[]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? spacing.sm : 0}>
        <ScrollView
          contentContainerStyle={[styles.scrollContent, scrollPadding]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}>
          <View style={styles.header}>
            <ThemedText style={styles.brandTitle} lightColor={colors.text} darkColor={colors.text}>
              Myle
            </ThemedText>
            <ThemedText style={styles.brandTagline} lightColor={colors.primary} darkColor={colors.primary}>
              Draw your run.
            </ThemedText>
            <ThemedText style={styles.brandSubtitle}>Myle 계정으로 로그인하세요</ThemedText>
          </View>

          <View style={styles.socialSection}>
            <SocialAuthButton
              provider="google"
              label="Google로 계속하기"
              loading={socialLoading === 'google'}
              disabled={isBusy && socialLoading !== 'google'}
              onPress={() => handleSocialSignIn('google')}
            />
            <SocialAuthButton
              provider="kakao"
              label="카카오톡으로 계속하기"
              loading={socialLoading === 'kakao'}
              disabled={isBusy && socialLoading !== 'kakao'}
              onPress={() => handleSocialSignIn('kakao')}
            />
          </View>

          {__DEV__ ? <OAuthDebugPanel /> : null}

          {!showEmailLogin && error ? (
            <View style={styles.feedbackBannerError}>
              <ThemedText style={styles.feedbackErrorText}>{error}</ThemedText>
            </View>
          ) : null}

          <Pressable
            onPress={toggleEmailLogin}
            disabled={isBusy}
            style={({ pressed }) => [styles.emailToggle, pressed && styles.emailTogglePressed]}
            accessibilityRole="button"
            accessibilityLabel={showEmailLogin ? '이메일 로그인 숨기기' : '이메일로 로그인'}>
            <ThemedText style={styles.emailToggleText}>
              {showEmailLogin ? '이메일 로그인 숨기기' : '이메일로 로그인'}
            </ThemedText>
          </Pressable>

          {showEmailLogin ? (
            <>
              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <ThemedText style={styles.dividerText}>이메일</ThemedText>
                <View style={styles.dividerLine} />
              </View>

              <View style={styles.formCard}>
                <ThemedText style={styles.formTitle}>이메일로 로그인</ThemedText>

                <View style={styles.fieldGroup}>
                  <ThemedText style={styles.label}>이메일</ThemedText>
                  <MyleInput
                    value={email}
                    onChangeText={setEmail}
                    placeholder="you@example.com"
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                    textContentType="emailAddress"
                    editable={!isBusy}
                  />
                </View>

                <View style={styles.fieldGroup}>
                  <ThemedText style={styles.label}>비밀번호</ThemedText>
                  <MyleInput
                    value={password}
                    onChangeText={setPassword}
                    placeholder="비밀번호 (6자 이상)"
                    secureTextEntry
                    textContentType="password"
                    editable={!isBusy}
                  />
                </View>

                {error ? (
                  <View style={styles.feedbackBannerError}>
                    <ThemedText style={styles.feedbackErrorText}>{error}</ThemedText>
                  </View>
                ) : null}

                {message ? (
                  <View style={styles.feedbackBannerSuccess}>
                    <ThemedText style={styles.feedbackSuccessText}>{message}</ThemedText>
                  </View>
                ) : null}

                <MyleButton
                  label="로그인"
                  onPress={handleSignIn}
                  loading={loading}
                  disabled={isBusy && !loading}
                  buttonStyle={styles.primaryButton}
                />

                <MyleButton
                  label="회원가입"
                  variant="outline"
                  onPress={handleSignUp}
                  disabled={isBusy}
                  buttonStyle={styles.secondaryButton}
                />
              </View>
            </>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </MyleScreen>
  );
}

function OAuthDebugPanel() {
  const redirectTo = getOAuthRedirectUri();
  const debug = getOAuthDebugInfo();
  const runtimeLabel =
    debug.runtime === 'expo-go'
      ? 'Expo Go'
      : debug.runtime === 'dev-build'
        ? 'Development Build'
        : 'Web';

  return (
    <View style={styles.oauthDebugBox}>
      <ThemedText style={styles.oauthDebugLabel}>DEV · OAuth · {runtimeLabel}</ThemedText>
      <ThemedText style={styles.oauthDebugValue} selectable>
        {redirectTo}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.xxl,
    gap: spacing.lg,
  },
  header: {
    alignItems: 'center',
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.xs,
  },
  brandTitle: {
    fontSize: 40,
    lineHeight: 48,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -1,
    color: colors.text,
    includeFontPadding: false,
  },
  brandTagline: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500',
    color: colors.primary,
    letterSpacing: 0.3,
  },
  brandSubtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.mutedText,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  socialSection: {
    gap: spacing.md,
  },
  emailToggle: {
    alignSelf: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginTop: spacing.xs,
  },
  emailTogglePressed: {
    opacity: 0.7,
  },
  emailToggleText: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
    color: colors.secondary,
    textAlign: 'center',
  },
  oauthDebugBox: {
    padding: spacing.md,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    gap: spacing.xs,
    opacity: 0.85,
  },
  oauthDebugLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.mutedText,
    letterSpacing: 0.4,
  },
  oauthDebugValue: {
    fontSize: 11,
    lineHeight: 16,
    color: colors.secondary,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.mutedText,
    fontWeight: '500',
  },
  formCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    gap: spacing.md,
  },
  formTitle: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  fieldGroup: {
    gap: spacing.sm,
  },
  label: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
    color: colors.mutedText,
  },
  feedbackBannerError: {
    backgroundColor: 'rgba(255, 69, 58, 0.12)',
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.stop,
    padding: spacing.md,
  },
  feedbackErrorText: {
    ...myleScreenStyles.errorText,
    textAlign: 'left',
  },
  feedbackSuccessText: {
    ...myleScreenStyles.successText,
    textAlign: 'left',
  },
  feedbackBannerSuccess: {
    backgroundColor: 'rgba(53, 242, 165, 0.1)',
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: 'rgba(53, 242, 165, 0.35)',
    padding: spacing.md,
  },
  primaryButton: {
    marginTop: spacing.sm,
  },
  secondaryButton: {
    marginTop: spacing.xs,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
