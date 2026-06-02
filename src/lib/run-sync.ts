import NetInfo from '@react-native-community/netinfo';
import * as Crypto from 'expo-crypto';

import {
  getPendingRunRecordByLocalId,
  getPendingRunRecords,
  markPendingRunRecordSynced,
  savePendingRunRecord,
  type PendingRunRecord,
} from '@/src/lib/pending-runs-storage';
import { saveRunSession, type SaveRunInput } from '@/src/lib/runs';

export const OFFLINE_SAVE_MESSAGE =
  '기록은 휴대폰에 임시 저장되었습니다. 네트워크가 연결되면 자동으로 서버에 저장됩니다.';

export type SaveRunWithLocalResult =
  | { ok: true; runId: string; synced: true }
  | { ok: true; localId: string; synced: false }
  | { ok: false; error: string };

const syncingLocalIds = new Set<string>();

function isNetworkAvailable(state: Awaited<ReturnType<typeof NetInfo.fetch>>): boolean {
  return Boolean(state.isConnected) && state.isInternetReachable !== false;
}

function toSaveRunInput(record: PendingRunRecord): SaveRunInput {
  return {
    userId: record.userId,
    startedAt: record.startedAt,
    endedAt: record.endedAt,
    distanceM: record.distanceKm * 1000,
    durationSeconds: record.durationSec,
    avgPaceSecondsPerKm: record.pace,
    points: record.points.map((point) => ({
      latitude: point.latitude,
      longitude: point.longitude,
      recordedAt: point.recordedAt,
    })),
  };
}

export async function uploadPendingRunRecord(
  record: PendingRunRecord,
): Promise<{ ok: true; runId: string } | { ok: false; error: string }> {
  if (record.syncStatus !== 'pending') {
    return { ok: false, error: 'Already synced' };
  }

  if (syncingLocalIds.has(record.localId)) {
    return { ok: false, error: 'Sync in progress' };
  }

  const latestRecord = await getPendingRunRecordByLocalId(record.localId);
  if (!latestRecord || latestRecord.syncStatus !== 'pending') {
    return { ok: false, error: 'Record is no longer pending' };
  }

  syncingLocalIds.add(record.localId);

  try {
    const result = await saveRunSession(toSaveRunInput(latestRecord));

    if (result.ok) {
      await markPendingRunRecordSynced(latestRecord.localId);
      return result;
    }

    return result;
  } finally {
    syncingLocalIds.delete(record.localId);
  }
}

export async function syncPendingRuns(userId: string): Promise<void> {
  const networkState = await NetInfo.fetch();

  if (!isNetworkAvailable(networkState)) {
    return;
  }

  const pendingRecords = await getPendingRunRecords(userId);

  for (const record of pendingRecords) {
    await uploadPendingRunRecord(record);
  }
}

type SaveRunWithLocalInput = {
  userId: string;
  startedAt: string;
  endedAt: string;
  distanceM: number;
  durationSeconds: number;
  avgPaceSecondsPerKm: number | null;
  points: { latitude: number; longitude: number; recordedAt: string }[];
};

export async function saveRunWithLocalFallback(
  input: SaveRunWithLocalInput,
): Promise<SaveRunWithLocalResult> {
  const localId = Crypto.randomUUID();
  const distanceKm = input.distanceM / 1000;

  const pendingRecord: PendingRunRecord = {
    localId,
    userId: input.userId,
    distanceKm,
    durationSec: input.durationSeconds,
    pace: input.avgPaceSecondsPerKm,
    startedAt: input.startedAt,
    endedAt: input.endedAt,
    points: input.points.map((point) => ({
      latitude: point.latitude,
      longitude: point.longitude,
      recordedAt: point.recordedAt,
    })),
    syncStatus: 'pending',
  };

  try {
    await savePendingRunRecord(pendingRecord);
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : '로컬 저장에 실패했습니다.',
    };
  }

  const uploadResult = await saveRunSession({
    userId: input.userId,
    startedAt: input.startedAt,
    endedAt: input.endedAt,
    distanceM: input.distanceM,
    durationSeconds: input.durationSeconds,
    avgPaceSecondsPerKm: input.avgPaceSecondsPerKm,
    points: input.points,
  });

  if (uploadResult.ok) {
    await markPendingRunRecordSynced(localId);
    return { ok: true, runId: uploadResult.runId, synced: true };
  }

  return { ok: true, localId, synced: false };
}
