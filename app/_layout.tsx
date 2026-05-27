import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { AuthProvider } from '@/src/contexts/auth-context';
import { ShapeMissionProvider } from '@/src/contexts/shape-mission-context';

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const pathname = usePathname();
  const onIntroScreen = pathname === '/' || pathname === '/index';

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }} initialRouteName="index">
        <Stack.Screen name="index" options={{ animation: 'none' }} />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="run-complete" />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      {!onIntroScreen ? <StatusBar style="auto" /> : null}
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
