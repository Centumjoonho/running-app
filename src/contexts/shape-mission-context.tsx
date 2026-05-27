import { createContext, useContext, useMemo, useState } from 'react';

import { type ShapeMission } from '@/src/constants/shape-missions';

type ShapeMissionContextValue = {
  mission: ShapeMission | null;
  setMission: (mission: ShapeMission | null) => void;
  clearMission: () => void;
};

const ShapeMissionContext = createContext<ShapeMissionContextValue | null>(null);

export function ShapeMissionProvider({ children }: { children: React.ReactNode }) {
  const [mission, setMissionState] = useState<ShapeMission | null>(null);

  const value = useMemo<ShapeMissionContextValue>(
    () => ({
      mission,
      setMission: setMissionState,
      clearMission: () => setMissionState(null),
    }),
    [mission],
  );

  return <ShapeMissionContext.Provider value={value}>{children}</ShapeMissionContext.Provider>;
}

export function useShapeMission() {
  const context = useContext(ShapeMissionContext);

  if (!context) {
    throw new Error('useShapeMission must be used within ShapeMissionProvider');
  }

  return context;
}
