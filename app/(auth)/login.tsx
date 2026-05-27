import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/src/contexts/auth-context';

export default function LoginScreen() {
  const { signIn, signUp } = useAuth();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const inputBackground = colorScheme === 'dark' ? '#1C1C1E' : '#F2F2F7';
  const borderColor = colorScheme === 'dark' ? '#3A3A3C' : '#E5E5EA';

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
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            <ThemedText type="title" style={styles.title}>
              Myle
            </ThemedText>
            <ThemedText style={styles.subtitle}>이메일로 로그인하세요</ThemedText>

            <View style={styles.form}>
              <ThemedText style={styles.label}>이메일</ThemedText>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: inputBackground, borderColor, color: theme.text },
                ]}
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                placeholderTextColor={theme.icon}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                textContentType="emailAddress"
                editable={!loading}
              />

              <ThemedText style={styles.label}>비밀번호</ThemedText>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: inputBackground, borderColor, color: theme.text },
                ]}
                value={password}
                onChangeText={setPassword}
                placeholder="비밀번호"
                placeholderTextColor={theme.icon}
                secureTextEntry
                textContentType="password"
                editable={!loading}
              />

              {error ? (
                <ThemedText style={styles.errorText} lightColor="#D32F2F" darkColor="#EF5350">
                  {error}
                </ThemedText>
              ) : null}

              {message ? (
                <ThemedText style={styles.messageText} lightColor="#2E7D32" darkColor="#81C784">
                  {message}
                </ThemedText>
              ) : null}

              <Pressable
                style={({ pressed }) => [
                  styles.primaryButton,
                  { backgroundColor: theme.tint, opacity: pressed || loading ? 0.85 : 1 },
                ]}
                onPress={handleSignIn}
                disabled={loading}>
                {loading ? (
                  <ActivityIndicator color={colorScheme === 'dark' ? '#151718' : '#fff'} />
                ) : (
                  <ThemedText style={styles.primaryButtonText} lightColor="#fff" darkColor="#151718">
                    로그인
                  </ThemedText>
                )}
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.secondaryButton,
                  { borderColor: theme.tint, opacity: pressed || loading ? 0.85 : 1 },
                ]}
                onPress={handleSignUp}
                disabled={loading}>
                <ThemedText style={[styles.secondaryButtonText, { color: theme.tint }]}>
                  회원가입
                </ThemedText>
              </Pressable>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 32,
    justifyContent: 'center',
    gap: 8,
  },
  title: {
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    opacity: 0.7,
    marginBottom: 24,
  },
  form: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 16,
  },
  errorText: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
  },
  messageText: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
  },
  primaryButton: {
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  primaryButtonText: {
    fontSize: 17,
    fontWeight: '600',
  },
  secondaryButton: {
    height: 52,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  secondaryButtonText: {
    fontSize: 17,
    fontWeight: '600',
  },
});
