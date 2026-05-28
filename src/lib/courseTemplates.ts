export type NormalizedPoint = {
  x: number;
  y: number;
};

export type CourseShape = 'heart' | 'star' | 'letterM';

export type CourseTemplate = {
  id: CourseShape;
  label: string;
  description: string;
  points: NormalizedPoint[];
};

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
      y: 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t),
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

const HEART_POINTS = createHeartPoints();
const STAR_POINTS = createStarPoints();
const LETTER_M_POINTS = createLetterMPoints();

export const COURSE_TEMPLATES: Record<CourseShape, CourseTemplate> = {
  heart: {
    id: 'heart',
    label: '하트',
    description: '사랑을 담은 하트 코스',
    points: HEART_POINTS,
  },
  star: {
    id: 'star',
    label: '별',
    description: '밤하늘 별 모양 코스',
    points: STAR_POINTS,
  },
  letterM: {
    id: 'letterM',
    label: '알파벳 M',
    description: 'Myle M 모양 코스',
    points: LETTER_M_POINTS,
  },
};

export const COURSE_SHAPE_OPTIONS = Object.values(COURSE_TEMPLATES);

export const COURSE_DISTANCE_OPTIONS_KM = [3, 5, 7] as const;

export type CourseDistanceKm = (typeof COURSE_DISTANCE_OPTIONS_KM)[number];

export function getCourseTemplate(shape: CourseShape): CourseTemplate {
  return COURSE_TEMPLATES[shape];
}
