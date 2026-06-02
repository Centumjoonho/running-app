import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@myle/pending-run-records';

export type SyncStatus = 'pending' | 'synced';

export type PendingRunPoint = {
  latitude: number;
  longitude: number;
  recordedAt: string;
};

export type PendingRunRecord = {
  localId: string;
  userId: string;
  distanceKm: number;
  durationSec: number;
  pace: number | null;
  startedAt: string;
  endedAt: string;
  points: PendingRunPoint[];
  syncStatus: SyncStatus;
};

async function readAllRecords(): Promise<PendingRunRecord[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);

  if (!raw) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as PendingRunRecord[]) : [];
  } catch {
    console.warn('[PendingRuns] Failed to parse stored records');
    return [];
  }
}

async function writeAllRecords(records: PendingRunRecord[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

export async function savePendingRunRecord(record: PendingRunRecord): Promise<void> {
  const records = await readAllRecords();
  const existingIndex = records.findIndex((item) => item.localId === record.localId);

  if (existingIndex >= 0) {
    records[existingIndex] = record;
  } else {
    records.push(record);
  }

  await writeAllRecords(records);
}

export async function getPendingRunRecords(userId: string): Promise<PendingRunRecord[]> {
  const records = await readAllRecords();
  return records.filter((record) => record.userId === userId && record.syncStatus === 'pending');
}

export async function getPendingRunRecordByLocalId(
  localId: string,
): Promise<PendingRunRecord | null> {
  const records = await readAllRecords();
  return records.find((record) => record.localId === localId) ?? null;
}

export async function removePendingRunRecord(localId: string): Promise<void> {
  const records = await readAllRecords();
  await writeAllRecords(records.filter((record) => record.localId !== localId));
}

export async function markPendingRunRecordSynced(localId: string): Promise<void> {
  await removePendingRunRecord(localId);
}
