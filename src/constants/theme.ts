import type { MapStyleElement } from 'react-native-maps';

export const colors = {
  background: '#0B0F14',
  card: '#151B23',
  primary: '#35F2A5',
  secondary: '#4DA3FF',
  text: '#FFFFFF',
  mutedText: '#9CA3AF',
  border: '#263241',
  stop: '#FF453A',
} as const;

export const overlays = {
  card: 'rgba(21, 27, 35, 0.92)',
  primaryBorder: 'rgba(53, 242, 165, 0.18)',
  primaryBorderActive: 'rgba(53, 242, 165, 0.35)',
  routeGlow: 'rgba(53, 242, 165, 0.28)',
  secondaryGlow: 'rgba(77, 163, 255, 0.35)',
  stop: 'rgba(255, 69, 58, 0.15)',
  handle: 'rgba(156, 163, 175, 0.35)',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const borderRadius = {
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 28,
  pill: 2,
  full: 9999,
} as const;

export const runMap = {
  minHeight: 280,
  regionDelta: 0.01,
  runningRegionDelta: 0.004,
  runningCameraZoom: 17,
  routeStrokeWidth: 4,
  routeGlowStrokeWidth: 10,
} as const;

export const darkMapStyle: MapStyleElement[] = [
  { elementType: 'geometry', stylers: [{ color: colors.background }] },
  { elementType: 'labels.text.fill', stylers: [{ color: colors.mutedText }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: colors.background }] },
  {
    featureType: 'administrative',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#1E2836' }],
  },
  {
    featureType: 'poi',
    elementType: 'geometry',
    stylers: [{ color: '#121820' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'geometry',
    stylers: [{ color: '#0F1712' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#1A2332' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#253044' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ color: '#243047' }],
  },
  {
    featureType: 'transit',
    elementType: 'geometry',
    stylers: [{ color: colors.card }],
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#081018' }],
  },
];
