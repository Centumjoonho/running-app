import { createContext, useContext, useMemo, useState } from 'react';

import type { Coordinate } from '@/src/lib/geo';

export type PlannedCourse = {
  coordinates: Coordinate[];
  estimatedDistanceKm: number;
  targetDistanceKm: number;
  routeType?: string;
  durationMin?: number;
  score?: number;
};

export type SetPlannedCourseInput = {
  coordinates: Coordinate[];
  estimatedDistanceKm: number;
  targetDistanceKm: number;
  routeType?: string;
  durationMin?: number;
  score?: number;
};

type PlannedCourseContextValue = {
  plannedCourse: PlannedCourse | null;
  setPlannedCourse: (course: SetPlannedCourseInput) => void;
  clearPlannedCourse: () => void;
};

const PlannedCourseContext = createContext<PlannedCourseContextValue | null>(null);

export function PlannedCourseProvider({ children }: { children: React.ReactNode }) {
  const [plannedCourse, setPlannedCourseState] = useState<PlannedCourse | null>(null);

  const value = useMemo<PlannedCourseContextValue>(
    () => ({
      plannedCourse,
      setPlannedCourse: (course) => {
        setPlannedCourseState({
          coordinates: course.coordinates,
          estimatedDistanceKm: course.estimatedDistanceKm,
          targetDistanceKm: course.targetDistanceKm,
          routeType: course.routeType,
          durationMin: course.durationMin,
          score: course.score,
        });
      },
      clearPlannedCourse: () => setPlannedCourseState(null),
    }),
    [plannedCourse],
  );

  return (
    <PlannedCourseContext.Provider value={value}>{children}</PlannedCourseContext.Provider>
  );
}

export function usePlannedCourse() {
  const context = useContext(PlannedCourseContext);

  if (!context) {
    throw new Error('usePlannedCourse must be used within PlannedCourseProvider');
  }

  return context;
}
