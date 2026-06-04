import { supabase } from '@/src/lib/supabase';

export type RunningDistanceKm = 3 | 5 | 7 | 10;

export const RUNNING_DISTANCE_OPTIONS_KM: RunningDistanceKm[] = [3, 5, 7, 10];

export type RoutePoint = {
  latitude: number;
  longitude: number;
};

export type RunningRoute = {
  distanceKm: number;
  durationMin: number;
  score: number;
  routeType: string;
  points: RoutePoint[];
  waypoints: RoutePoint[];
  warnings: string[];
};

type GenerateRunningRouteInput = {
  lat: number;
  lng: number;
  targetDistanceKm: RunningDistanceKm;
};

type GenerateRunningRouteResponse = {
  routes?: RunningRoute[];
  error?: string;
};

async function getFunctionAuthHeaders(): Promise<Record<string, string>> {
  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  if (!anonKey) {
    throw new Error('EXPO_PUBLIC_SUPABASE_ANON_KEY 환경 변수가 설정되지 않았습니다.');
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error('추천 코스를 생성하려면 로그인이 필요합니다.');
  }

  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${session.access_token}`,
    apikey: anonKey,
  };
}

function getRunningRouteFunctionUrl(): string {
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;

  if (!supabaseUrl) {
    throw new Error('EXPO_PUBLIC_SUPABASE_URL 환경 변수가 설정되지 않았습니다.');
  }

  return `${supabaseUrl.replace(/\/$/, '')}/functions/v1/generate-running-route`;
}

export async function generateRunningRoute(
  input: GenerateRunningRouteInput,
): Promise<RunningRoute[]> {
  const url = getRunningRouteFunctionUrl();
  const headers = await getFunctionAuthHeaders();

  let response: Response;

  try {
    response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(input),
    });
  } catch {
    throw new Error('추천 코스 서버에 연결할 수 없습니다. 네트워크를 확인해주세요.');
  }

  let data: GenerateRunningRouteResponse;

  try {
    data = (await response.json()) as GenerateRunningRouteResponse;
  } catch {
    throw new Error('추천 코스 응답을 해석할 수 없습니다.');
  }

  if (!response.ok) {
    throw new Error(data.error ?? `추천 코스 요청 실패 (${response.status})`);
  }

  if (!data.routes || data.routes.length === 0) {
    throw new Error('추천 코스를 찾지 못했습니다.');
  }

  return data.routes;
}

export function isValidRoutePoint(point: unknown): point is RoutePoint {
  if (!point || typeof point !== 'object') {
    return false;
  }

  const candidate = point as RoutePoint;
  return (
    typeof candidate.latitude === 'number' &&
    Number.isFinite(candidate.latitude) &&
    typeof candidate.longitude === 'number' &&
    Number.isFinite(candidate.longitude)
  );
}

export function isValidRunningRoute(route: unknown): route is RunningRoute {
  if (!route || typeof route !== 'object') {
    return false;
  }

  const candidate = route as RunningRoute;

  return (
    Array.isArray(candidate.points) &&
    candidate.points.length >= 2 &&
    candidate.points.every(isValidRoutePoint)
  );
}

export function validateRunningRoutes(routes: unknown): routes is RunningRoute[] {
  return Array.isArray(routes) && routes.length > 0 && routes.every(isValidRunningRoute);
}

export function formatRouteTypeLabel(routeType: string): string {
  switch (routeType) {
    case 'triangle':
      return '삼각형 루프';
    case 'square':
      return '사각형 루프';
    case 'wide-loop':
      return '넓은 루프';
    case 'short-loop':
      return '짧은 루프';
    default:
      return routeType;
  }
}
