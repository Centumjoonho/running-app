import { createContext, useContext, useMemo, useState } from 'react';

import type { CourseShape } from '@/src/lib/courseTemplates';
import type { GeneratedCourse } from '@/src/lib/courseGenerator';
import type { Coordinate } from '@/src/lib/geo';

export type PlannedCourse = {
  coordinates: Coordinate[];
  estimatedDistanceKm: number;
  targetDistanceKm: number;
  shape: CourseShape;
  center: Coordinate;
};

type PlannedCourseContextValue = {
  plannedCourse: PlannedCourse | null;
  setPlannedCourse: (course: GeneratedCourse) => void;
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
          shape: course.shape,
          center: course.center,
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
