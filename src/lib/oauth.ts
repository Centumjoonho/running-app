import type { Provider, Session } from '@supabase/supabase-js';
import * as WebBrowser from 'expo-web-browser';

import {
  getOAuthRedirectUri,
  isLocalhostRedirectUri,
  logOAuthRedirectConfig,
} from '@/src/lib/oauth-config';
import { supabase } from '@/src/lib/supabase';

/** OAuth callback URL에서 query + hash 파라미터 추출 (expo-auth-session QueryParams와 동일 동작). */
function getQueryParams(input: string): {
  errorCode: string | null;
  params: Record<string, string>;
} {
  const url = new URL(input, 'https://phony.example');
  const errorCode = url.searchParams.get('errorCode');
  url.searchParams.delete('errorCode');

  const params = Object.fromEntries(url.searchParams) as Record<string, string>;

  if (url.hash) {
    new URLSearchParams(url.hash.replace(/^#/, '')).forEach((value, key) => {
      params[key] = value;
    });
  }

  return { errorCode, params };
}

WebBrowser.maybeCompleteAuthSession();

export type SocialAuthProvider = 'google' | 'kakao';

export type SocialAuthResult = {
  error: string | null;
  cancelled?: boolean;
  redirectTo?: string;
};

export {
  DEV_BUILD_REDIRECT_URI,
  EXPO_GO_REDIRECT_URI,
  getOAuthDebugInfo,
  getOAuthRedirectUri,
  getOAuthRuntime,
  isExpoGoRuntime,
  isLocalhostRedirectUri,
  logOAuthRedirectConfig,
} from '@/src/lib/oauth-config';
export type { OAuthDebugInfo, OAuthRuntime } from '@/src/lib/oauth-config';

function logOAuthDebug(...args: unknown[]): void {
  if (__DEV__) {
    console.log(...args);
  }
}

function warnOAuthDebug(...args: unknown[]): void {
  if (__DEV__) {
    console.warn(...args);
  }
}

const PROVIDER_ERROR_MESSAGES: Record<SocialAuthProvider, string> = {
  google: 'Google 로그인 중 문제가 발생했습니다.',
  kakao: '카카오 로그인 중 문제가 발생했습니다.',
};

/**
 * Supabase Dashboard > Authentication > Providers > Kakao
 * "Allow users without an email" 옵션이 ON 이어야 account_email 없이 로그인할 수 있습니다.
 */
const KAKAO_INVALID_SCOPE_ERROR =
  '카카오 로그인 scope 오류가 발생했습니다. 앱에서는 scopes 옵션을 사용하지 않습니다.';

const EMPTY_REDIRECT_ERROR = 'OAuth redirectTo가 비어 있습니다. 앱 설정을 확인해주세요.';

const LOCALHOST_REDIRECT_ERROR =
  'OAuth redirectTo에 localhost가 포함되어 있습니다. redirectTo 설정과 Supabase Redirect URLs를 확인해주세요.';

const SUPABASE_REDIRECT_MISMATCH_ERROR =
  'Supabase OAuth URL의 redirect_to가 올바르지 않습니다. 콘솔에 출력된 redirectTo를 Supabase Redirect URLs에 정확히 등록해주세요.';

const KAKAO_URL_SCOPE_MARKERS = [
  'scopes',
  'scope',
  'account_email',
  'profile_nickname',
  'profile_image',
] as const;

type KakaoSignInOptions = {
  redirectTo: string;
  skipBrowserRedirect: true;
};

type SignInWithOAuthParams = {
  provider: Provider;
  options: KakaoSignInOptions;
};

function validateRedirectTo(redirectTo: string): string | null {
  if (!redirectTo.trim()) {
    return EMPTY_REDIRECT_ERROR;
  }

  if (isLocalhostRedirectUri(redirectTo)) {
    return LOCALHOST_REDIRECT_ERROR;
  }

  return null;
}

function extractRedirectToFromAuthUrl(authUrl: string): string | null {
  try {
    const url = new URL(authUrl);
    const value = url.searchParams.get('redirect_to');
    return value ? decodeURIComponent(value) : null;
  } catch {
    return null;
  }
}

/** Supabase authorize URL에 redirect_to를 명시적으로 설정 (Site URL fallback 방지). */
function applyRedirectToToAuthUrl(authUrl: string, redirectTo: string): string {
  const url = new URL(authUrl);
  url.searchParams.set('redirect_to', redirectTo);
  return url.toString();
}

function buildGoogleSignInParams(redirectTo: string): SignInWithOAuthParams {
  return {
    provider: 'google',
    options: {
      redirectTo,
      skipBrowserRedirect: true,
    },
  };
}

/** Kakao: redirectTo + skipBrowserRedirect만 사용 (scopes 미사용). */
function buildKakaoSignInParams(redirectTo: string): SignInWithOAuthParams {
  return {
    provider: 'kakao',
    options: {
      redirectTo,
      skipBrowserRedirect: true,
    },
  };
}

function inspectKakaoAuthUrl(authUrl: string, label: string): void {
  const decoded = decodeURIComponent(authUrl).toLowerCase();
  const foundMarkers = KAKAO_URL_SCOPE_MARKERS.filter((marker) => decoded.includes(marker));

  logOAuthDebug(`[OAuth][Kakao] ${label} scope marker check:`, {
    account_email: decoded.includes('account_email'),
    profile_nickname: decoded.includes('profile_nickname'),
    profile_image: decoded.includes('profile_image'),
    scope_param: decoded.includes('scope=') || decoded.includes('scope%3d'),
    scopes_param: decoded.includes('scopes=') || decoded.includes('scopes%3d'),
  });

  if (foundMarkers.length > 0) {
    warnOAuthDebug(`[OAuth][Kakao] ${label} contains scope-related values:`, foundMarkers);
    warnOAuthDebug(`[OAuth][Kakao] ${label}:`, authUrl);
  }

  try {
    const url = new URL(authUrl);
    const scope = url.searchParams.get('scope');
    const scopes = url.searchParams.get('scopes');

    if (scope) {
      warnOAuthDebug(`[OAuth][Kakao] ${label} scope query param:`, scope);
    }

    if (scopes) {
      warnOAuthDebug(`[OAuth][Kakao] ${label} scopes query param:`, scopes);
    }
  } catch {
    // ignore malformed URLs
  }
}

function logOAuthStart(
  provider: SocialAuthProvider,
  redirectTo: string,
  originalAuthUrl: string,
  sessionUrl: string,
  oauthParams: SignInWithOAuthParams,
): void {
  if (__DEV__) {
    logOAuthRedirectConfig();
  }
  logOAuthDebug(`[OAuth] provider: ${provider}`);
  logOAuthDebug(`[OAuth] redirectTo (${provider}):`, redirectTo);
  logOAuthDebug('[OAuth] signInWithOAuth params:', JSON.stringify(oauthParams, null, 2));
  logOAuthDebug('[OAuth] openAuthSessionAsync returnUrl:', redirectTo);
  logOAuthDebug('[OAuth] data.url (original):', originalAuthUrl);
  logOAuthDebug('[OAuth] redirect_to in original:', extractRedirectToFromAuthUrl(originalAuthUrl));
  logOAuthDebug('[OAuth] data.url (session):', sessionUrl);
  logOAuthDebug('[OAuth] redirect_to in session:', extractRedirectToFromAuthUrl(sessionUrl));

  if (provider === 'kakao') {
    inspectKakaoAuthUrl(originalAuthUrl, 'data.url');
    inspectKakaoAuthUrl(sessionUrl, 'session authUrl');
  }
}

function isInvalidScopeCallback(url: string): boolean {
  const { params } = getQueryParams(url);
  const description = (params.error_description ?? '').toLowerCase();

  return (
    params.error === 'invalid_scope' ||
    description.includes('invalid scope') ||
    description.includes('account_email') ||
    description.includes('koe205')
  );
}

function mapOAuthCallbackError(params: Record<string, string>): string | null {
  if (params.error === 'invalid_scope') {
    return KAKAO_INVALID_SCOPE_ERROR;
  }

  if (params.error) {
    return params.error_description ?? params.error;
  }

  return null;
}

export async function createSessionFromUrl(url: string): Promise<Session> {
  const { params, errorCode } = getQueryParams(url);

  if (errorCode) {
    throw new Error(errorCode);
  }

  const callbackError = mapOAuthCallbackError(params);
  if (callbackError) {
    throw new Error(callbackError);
  }

  const code = params.code;

  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      if (error.message.toLowerCase().includes('invalid scope')) {
        throw new Error(KAKAO_INVALID_SCOPE_ERROR);
      }
      throw error;
    }

    if (!data.session) {
      throw new Error('세션을 저장하지 못했습니다.');
    }

    return data.session;
  }

  const accessToken = params.access_token;
  const refreshToken = params.refresh_token;

  if (accessToken && refreshToken) {
    const { data, error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    if (error) {
      throw error;
    }

    if (!data.session) {
      throw new Error('세션을 저장하지 못했습니다.');
    }

    return data.session;
  }

  throw new Error('OAuth 응답에 인증 정보가 없습니다.');
}

async function runGoogleOAuth(redirectTo: string): Promise<SocialAuthResult> {
  const oauthParams = buildGoogleSignInParams(redirectTo);

  logOAuthDebug('[OAuth] signInWithOAuth - provider: google');
  logOAuthDebug('[OAuth] signInWithOAuth - options:', oauthParams.options);

  const { data, error } = await supabase.auth.signInWithOAuth(oauthParams);

  if (error || !data.url) {
    return { error: PROVIDER_ERROR_MESSAGES.google, redirectTo };
  }

  const sessionUrl = applyRedirectToToAuthUrl(data.url, redirectTo);
  const redirectInSessionUrl = extractRedirectToFromAuthUrl(sessionUrl);

  logOAuthStart('google', redirectTo, data.url, sessionUrl, oauthParams);

  if (!redirectInSessionUrl || redirectInSessionUrl !== redirectTo) {
    warnOAuthDebug('[OAuth] redirect_to mismatch:', {
      expected: redirectTo,
      actual: redirectInSessionUrl,
    });
    return { error: SUPABASE_REDIRECT_MISMATCH_ERROR, redirectTo };
  }

  if (isLocalhostRedirectUri(redirectInSessionUrl)) {
    return { error: LOCALHOST_REDIRECT_ERROR, redirectTo };
  }

  const result = await WebBrowser.openAuthSessionAsync(sessionUrl, redirectTo);

  if (result.type === 'cancel' || result.type === 'dismiss') {
    return { error: null, cancelled: true, redirectTo };
  }

  if (result.type !== 'success') {
    return { error: PROVIDER_ERROR_MESSAGES.google, redirectTo };
  }

  logOAuthDebug('[OAuth] callback url:', result.url);
  await createSessionFromUrl(result.url);
  logOAuthDebug('[OAuth] session saved via exchangeCodeForSession');
  return { error: null, redirectTo };
}

async function runKakaoOAuth(redirectTo: string): Promise<SocialAuthResult> {
  const oauthParams = buildKakaoSignInParams(redirectTo);

  logOAuthDebug('[OAuth][Kakao] signInWithOAuth - provider: kakao');
  logOAuthDebug('[OAuth][Kakao] signInWithOAuth - final options:', oauthParams.options);

  const { data, error } = await supabase.auth.signInWithOAuth(oauthParams);

  if (error || !data.url) {
    return { error: PROVIDER_ERROR_MESSAGES.kakao, redirectTo };
  }

  inspectKakaoAuthUrl(data.url, 'data.url');

  const sessionUrl = applyRedirectToToAuthUrl(data.url, redirectTo);
  const redirectInSessionUrl = extractRedirectToFromAuthUrl(sessionUrl);

  logOAuthStart('kakao', redirectTo, data.url, sessionUrl, oauthParams);

  if (!redirectInSessionUrl || redirectInSessionUrl !== redirectTo) {
    warnOAuthDebug('[OAuth] redirect_to mismatch:', {
      expected: redirectTo,
      actual: redirectInSessionUrl,
    });
    return { error: SUPABASE_REDIRECT_MISMATCH_ERROR, redirectTo };
  }

  if (isLocalhostRedirectUri(redirectInSessionUrl)) {
    return { error: LOCALHOST_REDIRECT_ERROR, redirectTo };
  }

  const result = await WebBrowser.openAuthSessionAsync(sessionUrl, redirectTo);

  if (result.type === 'cancel' || result.type === 'dismiss') {
    return { error: null, cancelled: true, redirectTo };
  }

  if (result.type !== 'success') {
    return { error: PROVIDER_ERROR_MESSAGES.kakao, redirectTo };
  }

  logOAuthDebug('[OAuth] callback url:', result.url);

  if (isInvalidScopeCallback(result.url)) {
    warnOAuthDebug('[OAuth][Kakao] invalid_scope callback detected:', result.url);
    return { error: KAKAO_INVALID_SCOPE_ERROR, redirectTo };
  }

  try {
    await createSessionFromUrl(result.url);
    logOAuthDebug('[OAuth] session saved via exchangeCodeForSession');
    return { error: null, redirectTo };
  } catch (caughtError) {
    warnOAuthDebug('[OAuth][Kakao] signInWithSocialProvider failed:', caughtError);

    const message = caughtError instanceof Error ? caughtError.message : '';
    if (message.toLowerCase().includes('invalid scope') || message.includes('account_email')) {
      return { error: KAKAO_INVALID_SCOPE_ERROR, redirectTo };
    }

    return { error: PROVIDER_ERROR_MESSAGES.kakao, redirectTo };
  }
}

/** Google / Kakao 공통 OAuth 로그인 */
export async function signInWithSocialProvider(
  provider: SocialAuthProvider,
): Promise<SocialAuthResult> {
  const redirectTo = getOAuthRedirectUri();

  const redirectValidationError = validateRedirectTo(redirectTo);
  if (redirectValidationError) {
    warnOAuthDebug('[OAuth] blocked invalid redirectTo:', redirectTo);
    return { error: redirectValidationError, redirectTo };
  }

  try {
    if (provider === 'kakao') {
      return await runKakaoOAuth(redirectTo);
    }

    return await runGoogleOAuth(redirectTo);
  } catch (caughtError) {
    warnOAuthDebug('[OAuth] signInWithSocialProvider failed:', caughtError);

    const message = caughtError instanceof Error ? caughtError.message : '';
    if (message.includes('Invalid scope') || message.toLowerCase().includes('invalid_scope')) {
      return { error: KAKAO_INVALID_SCOPE_ERROR, redirectTo };
    }

    return { error: PROVIDER_ERROR_MESSAGES[provider], redirectTo };
  }
}
