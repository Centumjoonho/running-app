import AntDesign from '@expo/vector-icons/AntDesign';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { borderRadius, colors, spacing } from '@/src/constants/theme';
import type { SocialAuthProvider } from '@/src/lib/oauth';

const KAKAO_YELLOW = '#FEE500';
const KAKAO_TEXT = '#191919';
const GOOGLE_ICON = '#4285F4';

type SocialAuthButtonProps = Omit<PressableProps, 'children' | 'style'> & {
  provider: SocialAuthProvider;
  label: string;
  loading?: boolean;
  buttonStyle?: StyleProp<ViewStyle>;
};

export function SocialAuthButton({
  provider,
  label,
  loading = false,
  disabled,
  buttonStyle,
  ...props
}: SocialAuthButtonProps) {
  const isGoogle = provider === 'google';
  const isKakao = provider === 'kakao';

  return (
    <Pressable
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        isGoogle && styles.google,
        isKakao && styles.kakao,
        { opacity: disabled || loading ? 0.5 : pressed ? 0.92 : 1 },
        buttonStyle,
      ]}
      {...props}>
      {loading ? (
        <ActivityIndicator color={isKakao ? KAKAO_TEXT : GOOGLE_ICON} />
      ) : (
        <View style={styles.content}>
          {isGoogle ? (
            <AntDesign name="google" size={20} color={GOOGLE_ICON} />
          ) : (
            <MaterialIcons name="chat-bubble" size={20} color={KAKAO_TEXT} />
          )}
          <ThemedText
            style={[styles.label, isGoogle && styles.googleLabel, isKakao && styles.kakaoLabel]}
            lightColor={isKakao ? KAKAO_TEXT : colors.background}
            darkColor={isKakao ? KAKAO_TEXT : colors.background}>
            {label}
          </ThemedText>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 54,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  google: {
    backgroundColor: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  kakao: {
    backgroundColor: KAKAO_YELLOW,
    borderWidth: 1,
    borderColor: KAKAO_YELLOW,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  label: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600',
  },
  googleLabel: {
    color: colors.background,
    fontWeight: '700',
  },
  kakaoLabel: {
    color: KAKAO_TEXT,
    fontWeight: '700',
  },
});
