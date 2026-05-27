import { useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';

import { IntroSplash } from '@/components/intro/intro-splash';
import { useAuth } from '@/src/contexts/auth-context';
import { introSession } from '@/src/lib/intro-session';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

const INTRO_DURATION_MS = 2000;

export default function IntroScreen() {
  const router = useRouter();
  const { session, isLoading } = useAuth();
  const [introDone, setIntroDone] = useState(false);
  const didRedirectRef = useRef(false);
  const didLogSessionLoadingRef = useRef(false);

  useEffect(() => {
    console.log('[AuthFlow] index intro 시작');
    SplashScreen.hideAsync().catch(() => undefined);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      console.log('[AuthFlow] index intro 종료');
      setIntroDone(true);
    }, INTRO_DURATION_MS);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (isLoading && !didLogSessionLoadingRef.current) {
      didLogSessionLoadingRef.current = true;
      console.log('[AuthFlow] session loading 시작');
    }
  }, [isLoading]);

  useEffect(() => {
    if (!introDone || isLoading || didRedirectRef.current) {
      return;
    }

    didRedirectRef.current = true;
    introSession.markCompleted();
    console.log('[AuthFlow] session 확인 결과:', session ? 'has-session' : 'no-session');

    if (session) {
      console.log('[AuthFlow] redirect target: /(tabs)');
      router.replace('/(tabs)');
      return;
    }

    console.log('[AuthFlow] redirect target: /(auth)/login');
    router.replace('/(auth)/login');
  }, [introDone, isLoading, session, router]);

  return (
    <>
      <StatusBar style="light" />
      <IntroSplash />
    </>
  );
}
