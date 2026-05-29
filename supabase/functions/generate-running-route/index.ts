import "@supabase/functions-js/edge-runtime.d.ts";

type Coordinate = {
  latitude: number;
  longitude: number;
};

type GenerateRunningRouteRequest = {
  lat: number;
  lng: number;
  targetDistanceKm: number;
};

type GeneratedRoute = {
  distanceKm: number;
  durationMin: number;
  score: number;
  routeType: string;
  points: Coordinate[];
  waypoints: Coordinate[];
  warnings: string[];
};

type SuccessResponse = {
  routes: GeneratedRoute[];
};

type ErrorResponse = {
  error: string;
};

type LoopTemplate = {
  routeType: string;
  vertexAngles: number[];
  radiusMultiplier: number;
};

type CandidateParams = {
  template: LoopTemplate;
  scaleFactor: number;
  rotationDegree: number;
};

const EARTH_RADIUS_M = 6371000;
const MAX_DISTANCE_GAP_RATIO = 0.3;
const MAX_RETURN_ROUTES = 3;
const MAPBOX_CONCURRENCY = 6;

const SCALE_FACTORS = [0.35, 0.45, 0.55, 0.65, 0.75, 0.9, 1.0];
const ROTATIONS_DEG = [0, 45, 90, 135, 180, 225, 270, 315];

const BASE_RADIUS_ANCHORS: Record<number, number> = {
  3: 350,
  5: 550,
  7: 750,
  10: 950,
};

const LOOP_TEMPLATES: LoopTemplate[] = [
  { routeType: "triangle", vertexAngles: [0, 120, 240], radiusMultiplier: 1.0 },
  { routeType: "square", vertexAngles: [0, 90, 180, 270], radiusMultiplier: 1.0 },
  { routeType: "wide-loop", vertexAngles: [0, 90, 180, 270], radiusMultiplier: 1.25 },
  { routeType: "short-loop", vertexAngles: [0, 120, 240], radiusMultiplier: 0.8 },
];

const NO_CANDIDATE_MESSAGE =
  "현재 위치 주변에서 목표 거리에 맞는 추천 러닝 코스를 찾지 못했습니다. 거리를 바꿔 다시 시도해주세요.";

const DEFAULT_WARNING =
  "실제 도로/인도 상황에 따라 경로가 달라질 수 있습니다.";

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: SuccessResponse | ErrorResponse, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...CORS_HEADERS,
      "Content-Type": "application/json",
    },
  });
}

function errorResponse(message: string, status: number): Response {
  return jsonResponse({ error: message }, status);
}

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

function interpolateBaseRadius(targetDistanceKm: number): number {
  const keys = Object.keys(BASE_RADIUS_ANCHORS).map(Number).sort((a, b) => a - b);

  if (targetDistanceKm <= keys[0]) {
    return BASE_RADIUS_ANCHORS[keys[0]] * (targetDistanceKm / keys[0]);
  }

  const maxKey = keys[keys.length - 1];
  if (targetDistanceKm >= maxKey) {
    return BASE_RADIUS_ANCHORS[maxKey] * (targetDistanceKm / maxKey);
  }

  for (let i = 0; i < keys.length - 1; i += 1) {
    const low = keys[i];
    const high = keys[i + 1];

    if (targetDistanceKm >= low && targetDistanceKm <= high) {
      const ratio = (targetDistanceKm - low) / (high - low);
      return BASE_RADIUS_ANCHORS[low] +
        (BASE_RADIUS_ANCHORS[high] - BASE_RADIUS_ANCHORS[low]) * ratio;
    }
  }

  return BASE_RADIUS_ANCHORS[keys[0]];
}

function offsetMetersToCoordinate(
  center: Coordinate,
  eastMeters: number,
  northMeters: number,
): Coordinate {
  const latitude =
    center.latitude + (northMeters / EARTH_RADIUS_M) * (180 / Math.PI);
  const longitude =
    center.longitude +
    (eastMeters / (EARTH_RADIUS_M * Math.cos(toRadians(center.latitude)))) *
      (180 / Math.PI);

  return { latitude, longitude };
}

function haversineMeters(a: Coordinate, b: Coordinate): number {
  const dLat = toRadians(b.latitude - a.latitude);
  const dLon = toRadians(b.longitude - a.longitude);
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;

  return EARTH_RADIUS_M * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function idealPathDistanceKm(waypoints: Coordinate[]): number {
  if (waypoints.length < 2) {
    return 0;
  }

  let meters = 0;
  for (let i = 1; i < waypoints.length; i += 1) {
    meters += haversineMeters(waypoints[i - 1], waypoints[i]);
  }

  return meters / 1000;
}

function buildLoopWaypoints(
  center: Coordinate,
  radiusMeters: number,
  vertexAngles: number[],
  rotationDegree: number,
): Coordinate[] {
  const vertices = vertexAngles.map((angle) => {
    const radians = toRadians(angle + rotationDegree);
    return offsetMetersToCoordinate(
      center,
      radiusMeters * Math.sin(radians),
      radiusMeters * Math.cos(radians),
    );
  });

  return [center, ...vertices, center];
}

function parseRequestBody(body: unknown): GenerateRunningRouteRequest | null {
  if (!body || typeof body !== "object") {
    return null;
  }

  const record = body as Record<string, unknown>;
  const { lat, lng, targetDistanceKm } = record;

  if (
    typeof lat !== "number" ||
    !Number.isFinite(lat) ||
    typeof lng !== "number" ||
    !Number.isFinite(lng) ||
    typeof targetDistanceKm !== "number" ||
    !Number.isFinite(targetDistanceKm) ||
    targetDistanceKm <= 0
  ) {
    return null;
  }

  return { lat, lng, targetDistanceKm };
}

type MapboxDirectionsResponse = {
  routes?: Array<{
    geometry?: {
      coordinates?: Array<[number, number]>;
    };
    distance?: number;
    duration?: number;
  }>;
  code?: string;
};

function geoJsonCoordinatesToPoints(
  coordinates: Array<[number, number]>,
): Coordinate[] {
  return coordinates.map(([longitude, latitude]) => ({
    latitude,
    longitude,
  }));
}

async function fetchWalkingRoute(
  waypoints: Coordinate[],
  accessToken: string,
): Promise<{ points: Coordinate[]; distanceKm: number; durationMin: number } | null> {
  if (waypoints.length < 2) {
    return null;
  }

  const coordinatePath = waypoints
    .map((point) => `${point.longitude},${point.latitude}`)
    .join(";");

  const url = new URL(
    `https://api.mapbox.com/directions/v5/mapbox/walking/${coordinatePath}`,
  );
  url.searchParams.set("geometries", "geojson");
  url.searchParams.set("overview", "full");
  url.searchParams.set("steps", "false");
  url.searchParams.set("access_token", accessToken);

  try {
    const response = await fetch(url.toString());
    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as MapboxDirectionsResponse;
    if (data.code && data.code !== "Ok") {
      return null;
    }

    const route = data.routes?.[0];
    const coordinates = route?.geometry?.coordinates;

    if (!route || !coordinates || coordinates.length === 0) {
      return null;
    }

    return {
      points: geoJsonCoordinatesToPoints(coordinates),
      distanceKm: (route.distance ?? 0) / 1000,
      durationMin: (route.duration ?? 0) / 60,
    };
  } catch {
    return null;
  }
}

function calculateRouteScore(
  targetDistanceKm: number,
  actualDistanceKm: number,
  idealDistanceKm: number,
): { score: number; distanceGapRatio: number } {
  const distanceGapRatio =
    Math.abs(actualDistanceKm - targetDistanceKm) / targetDistanceKm;

  const distanceScore = Math.max(0, 100 - distanceGapRatio * 150);

  const detourRatio = idealDistanceKm > 0
    ? Math.max(0, actualDistanceKm / idealDistanceKm - 1)
    : 0;
  const detourPenalty = detourRatio * 30;

  const score = Math.max(
    0,
    Math.min(100, Math.round(distanceScore - detourPenalty)),
  );

  return { score, distanceGapRatio };
}

function buildCandidateParams(): CandidateParams[] {
  const params: CandidateParams[] = [];

  for (const template of LOOP_TEMPLATES) {
    for (const scaleFactor of SCALE_FACTORS) {
      for (const rotationDegree of ROTATIONS_DEG) {
        params.push({ template, scaleFactor, rotationDegree });
      }
    }
  }

  return params;
}

async function runWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = [];

  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency);
    const batchResults = await Promise.all(batch.map(worker));
    results.push(...batchResults);
  }

  return results;
}

async function tryGenerateCandidate(
  input: GenerateRunningRouteRequest,
  center: Coordinate,
  baseRadiusMeters: number,
  params: CandidateParams,
  mapboxToken: string,
): Promise<GeneratedRoute | null> {
  const radiusMeters = baseRadiusMeters * params.template.radiusMultiplier *
    params.scaleFactor;
  const waypoints = buildLoopWaypoints(
    center,
    radiusMeters,
    params.template.vertexAngles,
    params.rotationDegree,
  );

  const walkingRoute = await fetchWalkingRoute(waypoints, mapboxToken);
  if (!walkingRoute) {
    return null;
  }

  const idealDistanceKm = idealPathDistanceKm(waypoints);
  const { score, distanceGapRatio } = calculateRouteScore(
    input.targetDistanceKm,
    walkingRoute.distanceKm,
    idealDistanceKm,
  );

  if (distanceGapRatio > MAX_DISTANCE_GAP_RATIO) {
    return null;
  }

  return {
    distanceKm: Number(walkingRoute.distanceKm.toFixed(2)),
    durationMin: Math.round(walkingRoute.durationMin),
    score,
    routeType: params.template.routeType,
    points: walkingRoute.points,
    waypoints,
    warnings: [DEFAULT_WARNING],
  };
}

async function generateRunningRoutes(
  input: GenerateRunningRouteRequest,
  mapboxToken: string,
): Promise<GeneratedRoute[]> {
  const center: Coordinate = {
    latitude: input.lat,
    longitude: input.lng,
  };

  const baseRadiusMeters = interpolateBaseRadius(input.targetDistanceKm);
  const candidateParams = buildCandidateParams();

  const candidateResults = await runWithConcurrency(
    candidateParams,
    MAPBOX_CONCURRENCY,
    (params) =>
      tryGenerateCandidate(input, center, baseRadiusMeters, params, mapboxToken),
  );

  const validCandidates = candidateResults.filter(
    (candidate): candidate is GeneratedRoute => candidate !== null,
  );

  if (validCandidates.length === 0) {
    return [];
  }

  return validCandidates
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_RETURN_ROUTES);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return errorResponse("POST 요청만 허용됩니다.", 405);
  }

  const mapboxToken = Deno.env.get("MAPBOX_ACCESS_TOKEN");
  if (!mapboxToken) {
    return errorResponse(
      "MAPBOX_ACCESS_TOKEN secret이 설정되지 않았습니다.",
      500,
    );
  }

  let body: unknown;

  try {
    body = await req.json();
  } catch {
    return errorResponse("요청 body는 JSON 형식이어야 합니다.", 400);
  }

  const parsed = parseRequestBody(body);
  if (!parsed) {
    return errorResponse(
      "lat, lng, targetDistanceKm 필드가 필요합니다.",
      400,
    );
  }

  try {
    const routes = await generateRunningRoutes(parsed, mapboxToken);

    if (routes.length === 0) {
      return errorResponse(NO_CANDIDATE_MESSAGE, 404);
    }

    return jsonResponse({ routes });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "경로 생성 중 알 수 없는 오류가 발생했습니다.";

    console.error("[generate-running-route]", message);
    return errorResponse(message, 502);
  }
});
