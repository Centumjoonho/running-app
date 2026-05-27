import { useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';

import { IntroSplash } from '@/components/intro/intro-splash';
import { useAuth } from '@/src/contexts/auth-context';
import { introSession } from '@/src/lib/intro-session';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

const INTRO_DURATION_MS = 2000;

export default function IntroScreen() {
  const router = useRouter();
  const { session, isLoading } = useAuth();
  const [introDone, setIntroDone] = useState(false);

  useEffect(() => {
    SplashScreen.hideAsync().catch(() => undefined);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setIntroDone(true), INTRO_DURATION_MS);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!introDone || isLoading) {
      return;
    }

    introSession.markCompleted();

    if (session) {
      router.replace('/(tabs)');
      return;
    }

    router.replace('/(auth)/login');
  }, [introDone, isLoading, session, router]);

  return (
    <>
      <StatusBar style="light" />
      <IntroSplash />
    </>
  );
}
