import "@supabase/functions-js/edge-runtime.d.ts";

type Coordinate = {
  latitude: number;
  longitude: number;
};

type NormalizedPoint = {
  x: number;
  y: number;
};

type Shape = "heart" | "star" | "letterM";

type GenerateShapeRouteRequest = {
  lat: number;
  lng: number;
  shape: Shape;
  targetDistanceKm: number;
};

type RouteDebug = {
  scaleMeter: number;
  rotationDegree: number;
  distanceGapRatio: number;
  candidateCount: number;
};

type GeneratedRoute = {
  shape: Shape;
  targetDistanceKm: number;
  distanceKm: number;
  durationMin: number;
  score: number;
  points: Coordinate[];
  waypoints: Coordinate[];
  warnings: string[];
  debug: RouteDebug;
};

type SuccessResponse = {
  routes: GeneratedRoute[];
};

type ErrorResponse = {
  error: string;
};

type CandidateParams = {
  scaleFactor: number;
  rotationDegree: number;
};

type WalkingRouteResult = {
  points: Coordinate[];
  distanceKm: number;
  durationMin: number;
};

const SUPPORTED_SHAPES: readonly Shape[] = ["heart", "star", "letterM"];
const MAX_MAPBOX_WAYPOINTS = 12;
const EARTH_RADIUS_M = 6371000;
const MAX_DISTANCE_GAP_RATIO = 0.35;
const MAX_RETURN_ROUTES = 3;
const MAPBOX_CONCURRENCY = 6;

const SCALE_FACTORS = [0.35, 0.45, 0.55, 0.65, 0.75, 0.9, 1.0];
const ROTATIONS_DEG = [0, 45, 90, 135, 180, 225, 270, 315];

const LETTER_M_BASE_SCALES: Record<number, number> = {
  3: 220,
  5: 330,
  7: 450,
};

const CLOSED_SHAPE_BASE_SCALES: Record<number, number> = {
  3: 350,
  5: 550,
  7: 750,
};

const NO_CANDIDATE_MESSAGE =
  "현재 위치 주변에서 목표 거리와 도형에 맞는 보행 코스를 찾지 못했습니다. 거리나 도형을 바꿔 다시 시도해주세요.";

const DEFAULT_WARNING =
  "실제 보행 가능 경로에 맞추면서 도형이 일부 변형될 수 있습니다.";

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

function normalizePoints(points: NormalizedPoint[]): NormalizedPoint[] {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const point of points) {
    minX = Math.min(minX, point.x);
    maxX = Math.max(maxX, point.x);
    minY = Math.min(minY, point.y);
    maxY = Math.max(maxY, point.y);
  }

  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  const halfRange = Math.max(maxX - minX, maxY - minY) / 2 || 1;

  return points.map((point) => ({
    x: (point.x - centerX) / halfRange,
    y: (point.y - centerY) / halfRange,
  }));
}

function createHeartPoints(steps = 120): NormalizedPoint[] {
  const raw: NormalizedPoint[] = [];

  for (let i = 0; i <= steps; i += 1) {
    const t = (2 * Math.PI * i) / steps;
    raw.push({
      x: 16 * Math.sin(t) ** 3,
      y:
        13 * Math.cos(t) -
        5 * Math.cos(2 * t) -
        2 * Math.cos(3 * t) -
        Math.cos(4 * t),
    });
  }

  return normalizePoints(raw);
}

function createStarPoints(): NormalizedPoint[] {
  const raw: NormalizedPoint[] = [];

  for (let i = 0; i < 10; i += 1) {
    const angle = Math.PI / 2 + (i * Math.PI) / 5;
    const radius = i % 2 === 0 ? 1 : 0.42;
    raw.push({
      x: radius * Math.cos(angle),
      y: radius * Math.sin(angle),
    });
  }

  raw.push(raw[0]);
  return normalizePoints(raw);
}

/**
 * letterM은 열린 선 형태에 가깝습니다.
 * 실제 도로망에서는 M 모양이 쉽게 흐트러질 수 있습니다.
 * TODO: 추후 block-letter 또는 closed-loop 형태로 개선 필요
 */
function createLetterMPoints(): NormalizedPoint[] {
  const raw: NormalizedPoint[] = [
    { x: -1, y: -1 },
    { x: -1, y: 1 },
    { x: 0, y: -0.15 },
    { x: 1, y: 1 },
    { x: 1, y: -1 },
    { x: -1, y: -1 },
  ];

  return normalizePoints(raw);
}

const SHAPE_TEMPLATES: Record<Shape, NormalizedPoint[]> = {
  heart: createHeartPoints(),
  star: createStarPoints(),
  letterM: createLetterMPoints(),
};

function isShape(value: unknown): value is Shape {
  return typeof value === "string" && SUPPORTED_SHAPES.includes(value as Shape);
}

function interpolateBaseScale(
  targetDistanceKm: number,
  anchors: Record<number, number>,
): number {
  const keys = Object.keys(anchors).map(Number).sort((a, b) => a - b);

  if (keys.length === 0) {
    return targetDistanceKm * 150;
  }

  if (targetDistanceKm <= keys[0]) {
    return anchors[keys[0]] * (targetDistanceKm / keys[0]);
  }

  const maxKey = keys[keys.length - 1];
  if (targetDistanceKm >= maxKey) {
    return anchors[maxKey] * (targetDistanceKm / maxKey);
  }

  for (let i = 0; i < keys.length - 1; i += 1) {
    const low = keys[i];
    const high = keys[i + 1];

    if (targetDistanceKm >= low && targetDistanceKm <= high) {
      const ratio = (targetDistanceKm - low) / (high - low);
      return anchors[low] + (anchors[high] - anchors[low]) * ratio;
    }
  }

  return anchors[keys[0]];
}

function getBaseScaleMeters(shape: Shape, targetDistanceKm: number): number {
  if (shape === "letterM") {
    return interpolateBaseScale(targetDistanceKm, LETTER_M_BASE_SCALES);
  }

  return interpolateBaseScale(targetDistanceKm, CLOSED_SHAPE_BASE_SCALES);
}

function rotateNormalizedPoints(
  points: NormalizedPoint[],
  rotationDegree: number,
): NormalizedPoint[] {
  if (rotationDegree === 0) {
    return points;
  }

  const radians = toRadians(rotationDegree);
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);

  return points.map((point) => ({
    x: point.x * cos - point.y * sin,
    y: point.x * sin + point.y * cos,
  }));
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

function templateToCoordinates(
  center: Coordinate,
  templatePoints: NormalizedPoint[],
  scaleMeters: number,
): Coordinate[] {
  return templatePoints.map((point) =>
    offsetMetersToCoordinate(center, point.x * scaleMeters, point.y * scaleMeters)
  );
}

function sampleWaypoints(
  points: NormalizedPoint[],
  maxCount: number,
): NormalizedPoint[] {
  if (points.length <= maxCount) {
    return points;
  }

  const sampled: NormalizedPoint[] = [];

  for (let i = 0; i < maxCount; i += 1) {
    const index = Math.round((i * (points.length - 1)) / (maxCount - 1));
    sampled.push(points[index]);
  }

  return sampled;
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

function parseRequestBody(body: unknown): GenerateShapeRouteRequest | null {
  if (!body || typeof body !== "object") {
    return null;
  }

  const record = body as Record<string, unknown>;
  const { lat, lng, shape, targetDistanceKm } = record;

  if (
    typeof lat !== "number" ||
    !Number.isFinite(lat) ||
    typeof lng !== "number" ||
    !Number.isFinite(lng) ||
    !isShape(shape) ||
    typeof targetDistanceKm !== "number" ||
    !Number.isFinite(targetDistanceKm) ||
    targetDistanceKm <= 0
  ) {
    return null;
  }

  return { lat, lng, shape, targetDistanceKm };
}

type MapboxDirectionsResponse = {
  routes?: Array<{
    geometry?: {
      coordinates?: Array<[number, number]>;
    };
    distance?: number;
    duration?: number;
  }>;
  message?: string;
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
): Promise<WalkingRouteResult | null> {
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
  const detourPenalty = detourRatio * 40;

  const score = Math.max(
    0,
    Math.min(100, Math.round(distanceScore - detourPenalty)),
  );

  return { score, distanceGapRatio };
}

function buildCandidateParams(): CandidateParams[] {
  const params: CandidateParams[] = [];

  for (const scaleFactor of SCALE_FACTORS) {
    for (const rotationDegree of ROTATIONS_DEG) {
      params.push({ scaleFactor, rotationDegree });
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

type RouteCandidate = GeneratedRoute;

async function tryGenerateCandidate(
  input: GenerateShapeRouteRequest,
  center: Coordinate,
  templatePoints: NormalizedPoint[],
  baseScaleMeters: number,
  params: CandidateParams,
  mapboxToken: string,
): Promise<RouteCandidate | null> {
  const scaleMeter = baseScaleMeters * params.scaleFactor;
  const rotatedTemplate = rotateNormalizedPoints(
    templatePoints,
    params.rotationDegree,
  );
  const sampledTemplate = sampleWaypoints(rotatedTemplate, MAX_MAPBOX_WAYPOINTS);
  const waypoints = templateToCoordinates(center, sampledTemplate, scaleMeter);

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
    shape: input.shape,
    targetDistanceKm: input.targetDistanceKm,
    distanceKm: Number(walkingRoute.distanceKm.toFixed(2)),
    durationMin: Math.round(walkingRoute.durationMin),
    score,
    points: walkingRoute.points,
    waypoints,
    warnings: [DEFAULT_WARNING],
    debug: {
      scaleMeter: Number(scaleMeter.toFixed(1)),
      rotationDegree: params.rotationDegree,
      distanceGapRatio: Number(distanceGapRatio.toFixed(4)),
      candidateCount: 0,
    },
  };
}

async function generateShapeRoutes(
  input: GenerateShapeRouteRequest,
  mapboxToken: string,
): Promise<GeneratedRoute[]> {
  const center: Coordinate = {
    latitude: input.lat,
    longitude: input.lng,
  };

  const templatePoints = SHAPE_TEMPLATES[input.shape];
  const baseScaleMeters = getBaseScaleMeters(input.shape, input.targetDistanceKm);
  const candidateParams = buildCandidateParams();

  const candidateResults = await runWithConcurrency(
    candidateParams,
    MAPBOX_CONCURRENCY,
    (params) =>
      tryGenerateCandidate(
        input,
        center,
        templatePoints,
        baseScaleMeters,
        params,
        mapboxToken,
      ),
  );

  const validCandidates = candidateResults.filter(
    (candidate): candidate is RouteCandidate => candidate !== null,
  );

  if (validCandidates.length === 0) {
    return [];
  }

  const sortedCandidates = validCandidates
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_RETURN_ROUTES)
    .map((candidate) => ({
      ...candidate,
      debug: {
        ...candidate.debug,
        candidateCount: validCandidates.length,
      },
    }));

  return sortedCandidates;
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
    const record = body as Record<string, unknown>;
    const shape = record?.shape;

    if (shape !== undefined && !isShape(shape)) {
      return errorResponse(
        `지원하지 않는 shape입니다. 지원 값: ${SUPPORTED_SHAPES.join(", ")}`,
        400,
      );
    }

    return errorResponse(
      "lat, lng, shape, targetDistanceKm 필드가 필요합니다.",
      400,
    );
  }

  try {
    const routes = await generateShapeRoutes(parsed, mapboxToken);

    if (routes.length === 0) {
      return errorResponse(NO_CANDIDATE_MESSAGE, 404);
    }

    const response: SuccessResponse = { routes };
    return jsonResponse(response);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "경로 생성 중 알 수 없는 오류가 발생했습니다.";

    console.error("[generate-shape-route]", message);
    return errorResponse(message, 502);
  }
});
