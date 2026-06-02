import * as Location from 'expo-location';
import { useEffect, useState } from 'react';

import type { Coordinate } from '@/src/lib/geo';

export type CurrentLocationState =
  | { status: 'loading' }
  | { status: 'granted'; coordinate: Coordinate }
  | { status: 'denied' };

type UseCurrentLocationOptions = {
  enabled?: boolean;
  watch?: boolean;
};

export function useCurrentLocation(options: UseCurrentLocationOptions = {}): CurrentLocationState {
  const { enabled = true, watch = false } = options;
  const [state, setState] = useState<CurrentLocationState>({ status: 'loading' });

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let isMounted = true;
    let subscription: Location.LocationSubscription | null = null;

    async function start() {
      const permission = await Location.getForegroundPermissionsAsync();

      if (!isMounted) {
        return;
      }

      if (permission.status !== 'granted') {
        const request = await Location.requestForegroundPermissionsAsync();

        if (!isMounted) {
          return;
        }

        if (request.status !== 'granted') {
          setState({ status: 'denied' });
          return;
        }
      }

      const applyPosition = (position: Location.LocationObject) => {
        const { latitude, longitude } = position.coords;

        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
          return;
        }

        setState({
          status: 'granted',
          coordinate: { latitude, longitude },
        });
      };

      try {
        const position = await Location.getCurrentPositionAsync({});
        if (!isMounted) {
          return;
        }

        applyPosition(position);

        if (watch) {
          subscription = await Location.watchPositionAsync(
            {
              accuracy: Location.Accuracy.Balanced,
              distanceInterval: 10,
            },
            (nextPosition) => {
              if (isMounted) {
                applyPosition(nextPosition);
              }
            },
          );
        }
      } catch {
        if (isMounted) {
          setState({ status: 'denied' });
        }
      }
    }

    start();

    return () => {
      isMounted = false;
      subscription?.remove();
    };
  }, [enabled, watch]);

  return state;
}
