import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';

export const APP_SCHEME = 'myle';
export const OAUTH_CALLBACK_PATH = 'auth/callback';

/**
 * Development Build / 실제 앱 (EAS Build, expo run:ios 등)
 * Supabase Redirect URLs에 등록: myle://auth/callback
 */
export const DEV_BUILD_REDIRECT_URI = `${APP_SCHEME}://${OAUTH_CALLBACK_PATH}`;

/**
 * Expo Go (현재 개발 환경)
 * Supabase Site URL + Redirect URLs에 등록:
 * exp://192.168.100.208:8081/--/auth/callback
 *
 * Metro IP/포트가 바뀌면 이 값과 Supabase 설정을 함께 갱신하세요.
 */
export const EXPO_GO_REDIRECT_URI = 'exp://192.168.100.208:8081/--/auth/callback';

export type OAuthRuntime = 'expo-go' | 'dev-build' | 'web';

export function getOAuthRuntime(): OAuthRuntime {
  if (Platform.OS === 'web') {
    return 'web';
  }

  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) {
    return 'expo-go';
  }

  return 'dev-build';
}

export function isExpoGoRuntime(): boolean {
  return getOAuthRuntime() === 'expo-go';
}

/**
 * OAuth redirectTo — Google/Kakao 공통
 * - Expo Go: exp://… (현재 개발 기본값)
 * - Dev Build / Store: myle://auth/callback
 */
export function getOAuthRedirectUri(): string {
  const runtime = getOAuthRuntime();

  if (runtime === 'expo-go') {
    return EXPO_GO_REDIRECT_URI;
  }

  return DEV_BUILD_REDIRECT_URI;
}

export function isLocalhostRedirectUri(redirectUri: string): boolean {
  const normalized = redirectUri.toLowerCase();
  return normalized.includes('localhost') || normalized.includes('127.0.0.1');
}

export type OAuthDebugInfo = {
  redirectTo: string;
  runtime: OAuthRuntime;
  environment: ExecutionEnvironment | null;
  hostUri: string | null;
  platform: string;
};

export function getOAuthDebugInfo(): OAuthDebugInfo {
  return {
    redirectTo: getOAuthRedirectUri(),
    runtime: getOAuthRuntime(),
    environment: Constants.executionEnvironment ?? null,
    hostUri: Constants.expoConfig?.hostUri ?? null,
    platform: Platform.OS,
  };
}

export function logOAuthRedirectConfig(): void {
  const debug = getOAuthDebugInfo();

  console.log('[OAuth] runtime:', debug.runtime);
  console.log('[OAuth] redirectTo:', debug.redirectTo);
  console.log('[OAuth] Supabase Redirect URLs에 등록할 값:', debug.redirectTo);
  console.log('[OAuth] executionEnvironment:', debug.environment);
  console.log('[OAuth] hostUri:', debug.hostUri ?? '(none)');
}
