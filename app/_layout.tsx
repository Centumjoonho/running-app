import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';
import 'react-native-reanimated';

import { ThemedView } from '@/components/themed-view';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { AuthProvider, useAuth } from '@/src/contexts/auth-context';

export const unstable_settings = {
  anchor: '(tabs)',
};

const PROTECTED_TABS = new Set(['index', 'run', 'records']);

function AuthGate({ children }: { children: React.ReactNode }) {
  const { session, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  const inAuthGroup = segments[0] === '(auth)';
  const currentTab = segments[0] === '(tabs)' ? segments[1] : undefined;
  const isProtectedTab = currentTab ? PROTECTED_TABS.has(currentTab) : false;
  const shouldRedirectToLogin = !session && isProtectedTab;
  const shouldRedirectToTabs = !!session && inAuthGroup;

  useEffect(() => {
    if (isLoading) {
      return;
    }

    if (shouldRedirectToLogin) {
      router.replace('/(auth)/login');
    } else if (shouldRedirectToTabs) {
      router.replace('/(tabs)');
    }
  }, [isLoading, shouldRedirectToLogin, shouldRedirectToTabs, router]);

  if (isLoading || shouldRedirectToLogin || shouldRedirectToTabs) {
    return (
      <ThemedView style={styles.loading}>
        <ActivityIndicator size="large" />
      </ThemedView>
    );
  }

  return children;
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AuthGate>
        <Stack>
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        </Stack>
      </AuthGate>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
