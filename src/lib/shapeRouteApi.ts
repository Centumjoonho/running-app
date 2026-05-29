export type ShapeType = 'heart' | 'star' | 'letterM';

export type TargetDistanceKm = 3 | 5 | 7;

export type RoutePoint = {
  latitude: number;
  longitude: number;
};

export type ShapeRoute = {
  shape: ShapeType;
  targetDistanceKm: number;
  distanceKm: number;
  durationMin: number;
  score: number;
  points: RoutePoint[];
  waypoints: RoutePoint[];
  warnings: string[];
};

type GenerateShapeRouteInput = {
  lat: number;
  lng: number;
  shape: ShapeType;
  targetDistanceKm: TargetDistanceKm;
};

type GenerateShapeRouteResponse = {
  routes?: ShapeRoute[];
  error?: string;
};

function getShapeRouteFunctionUrl(): string {
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;

  if (!supabaseUrl) {
    throw new Error(
      'EXPO_PUBLIC_SUPABASE_URL 환경 변수가 설정되지 않았습니다.',
    );
  }

  return `${supabaseUrl.replace(/\/$/, '')}/functions/v1/generate-shape-route`;
}

export async function generateShapeRoute(
  input: GenerateShapeRouteInput,
): Promise<ShapeRoute[]> {
  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  if (!anonKey) {
    throw new Error(
      'EXPO_PUBLIC_SUPABASE_ANON_KEY 환경 변수가 설정되지 않았습니다.',
    );
  }

  const url = getShapeRouteFunctionUrl();

  let response: Response;

  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${anonKey}`,
        apikey: anonKey,
      },
      body: JSON.stringify(input),
    });
  } catch {
    throw new Error('코스 생성 서버에 연결할 수 없습니다. 네트워크를 확인해주세요.');
  }

  let data: GenerateShapeRouteResponse;

  try {
    data = (await response.json()) as GenerateShapeRouteResponse;
  } catch {
    throw new Error('코스 생성 응답을 해석할 수 없습니다.');
  }

  if (!response.ok) {
    throw new Error(data.error ?? `코스 생성 요청 실패 (${response.status})`);
  }

  if (!data.routes || data.routes.length === 0) {
    throw new Error('생성된 코스가 없습니다.');
  }

  return data.routes;
}
