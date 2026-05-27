import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Redirect, Stack, usePathname, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { AuthProvider, useAuth } from '@/src/contexts/auth-context';
import { ShapeMissionProvider } from '@/src/contexts/shape-mission-context';
import { introSession } from '@/src/lib/intro-session';

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const { session } = useAuth();
  const pathname = usePathname();
  const segments = useSegments();
  const inAuthGroup = segments[0] === '(auth)';
  const onIntroScreen = pathname === '/' || pathname === '/index';
  const introCompleted = introSession.isCompleted();

  if (!introCompleted && !onIntroScreen) {
    return <Redirect href="/" />;
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      {introCompleted && !session && !inAuthGroup ? (
        <Redirect href="/(auth)/login" />
      ) : introCompleted && session && inAuthGroup ? (
        <Redirect href="/(tabs)" />
      ) : (
        <>
          <Stack screenOptions={{ headerShown: false }} initialRouteName="index">
            <Stack.Screen name="index" options={{ animation: 'none' }} />
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="run-complete" />
            <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
          </Stack>
          {!onIntroScreen ? <StatusBar style="auto" /> : null}
        </>
      )}
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <ShapeMissionProvider>
        <RootLayoutNav />
      </ShapeMissionProvider>
    </AuthProvider>
  );
}
