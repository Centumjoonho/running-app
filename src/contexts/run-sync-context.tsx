import NetInfo from '@react-native-community/netinfo';
import { createContext, useContext, useEffect, useRef } from 'react';

import { useAuth } from '@/src/contexts/auth-context';
import { syncPendingRuns } from '@/src/lib/run-sync';

type RunSyncContextValue = {
  syncNow: () => Promise<void>;
};

const RunSyncContext = createContext<RunSyncContextValue | null>(null);

function isNetworkOnline(state: { isConnected: boolean | null; isInternetReachable: boolean | null }) {
  return Boolean(state.isConnected) && state.isInternetReachable !== false;
}

export function RunSyncProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const userId = session?.user?.id;
  const wasOfflineRef = useRef(false);

  const syncNow = async () => {
    if (!userId) {
      return;
    }

    await syncPendingRuns(userId);
  };

  useEffect(() => {
    if (!userId) {
      return;
    }

    const activeUserId = userId;
    let isMounted = true;

    async function syncIfOnline() {
      const state = await NetInfo.fetch();

      if (!isMounted) {
        return;
      }

      wasOfflineRef.current = !isNetworkOnline(state);

      if (isNetworkOnline(state)) {
        await syncPendingRuns(activeUserId);
      }
    }

    syncIfOnline();

    const unsubscribe = NetInfo.addEventListener((state) => {
      const isOnline = isNetworkOnline(state);

      if (isOnline && wasOfflineRef.current) {
        syncPendingRuns(activeUserId);
      }

      wasOfflineRef.current = !isOnline;
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [userId]);

  return <RunSyncContext.Provider value={{ syncNow }}>{children}</RunSyncContext.Provider>;
}

export function useRunSync() {
  const context = useContext(RunSyncContext);

  if (!context) {
    throw new Error('useRunSync must be used within RunSyncProvider');
  }

  return context;
}
