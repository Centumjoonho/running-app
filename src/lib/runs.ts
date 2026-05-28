import { supabase } from '@/src/lib/supabase';

export type RunSession = {
  id: string;
  started_at: string;
  ended_at: string | null;
  distance_m: number;
  duration_seconds: number;
  avg_pace_seconds_per_km: number | null;
};

export type RunPoint = {
  latitude: number;
  longitude: number;
  recorded_at: string;
  seq: number;
};

export type RunPointInput = {
  latitude: number;
  longitude: number;
  recordedAt: string;
};

export type SaveRunInput = {
  userId: string;
  startedAt: string;
  endedAt: string;
  distanceM: number;
  durationSeconds: number;
  avgPaceSecondsPerKm: number | null;
  points: RunPointInput[];
};

export type SaveRunResult =
  | { ok: true; runId: string }
  | { ok: false; error: string };

export type DeleteRunResult = { ok: true } | { ok: false; error: string };

function isForeignKeyViolation(message: string, code?: string): boolean {
  if (code === '23503') {
    return true;
  }

  const normalized = message.toLowerCase();
  return (
    normalized.includes('foreign key') ||
    normalized.includes('violates foreign key constraint') ||
    normalized.includes('still referenced')
  );
}

async function deleteRunPoints(runId: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from('run_points').delete().eq('run_id', runId);

  if (error) {
    return { error: error.message };
  }

  return { error: null };
}

async function deleteRunSessionRow(
  runId: string,
  userId: string,
): Promise<{ error: string | null; code?: string }> {
  const { error } = await supabase
    .from('run_sessions')
    .delete()
    .eq('id', runId)
    .eq('user_id', userId);

  if (error) {
    return { error: error.message, code: error.code };
  }

  return { error: null };
}

/** 현재 로그인 사용자의 run_session과 연결된 run_points를 삭제합니다. */
export async function deleteRunSession(
  runId: string,
  userId: string,
): Promise<DeleteRunResult> {
  const sessionDelete = await deleteRunSessionRow(runId, userId);

  if (!sessionDelete.error) {
    return { ok: true };
  }

  if (!isForeignKeyViolation(sessionDelete.error, sessionDelete.code)) {
    return { ok: false, error: sessionDelete.error };
  }

  const pointsDelete = await deleteRunPoints(runId);
  if (pointsDelete.error) {
    return { ok: false, error: pointsDelete.error };
  }

  const retrySessionDelete = await deleteRunSessionRow(runId, userId);
  if (retrySessionDelete.error) {
    return { ok: false, error: retrySessionDelete.error };
  }

  return { ok: true };
}

export async function saveRunSession(input: SaveRunInput): Promise<SaveRunResult> {
  const { data: session, error: sessionError } = await supabase
    .from('run_sessions')
    .insert({
      user_id: input.userId,
      started_at: input.startedAt,
      ended_at: input.endedAt,
      distance_m: input.distanceM,
      duration_seconds: input.durationSeconds,
      avg_pace_seconds_per_km: input.avgPaceSecondsPerKm,
    })
    .select('id')
    .single();

  if (sessionError) {
    return { ok: false, error: sessionError.message };
  }

  if (input.points.length === 0) {
    return { ok: true, runId: session.id };
  }

  const { error: pointsError } = await supabase.from('run_points').insert(
    input.points.map((point, seq) => ({
      run_id: session.id,
      latitude: point.latitude,
      longitude: point.longitude,
      recorded_at: point.recordedAt,
      seq,
    })),
  );

  if (pointsError) {
    await supabase.from('run_sessions').delete().eq('id', session.id);
    return { ok: false, error: pointsError.message };
  }

  return { ok: true, runId: session.id };
}

export async function getRunSessions(
  userId: string,
): Promise<{ data: RunSession[]; error: string | null }> {
  const { data, error } = await supabase
    .from('run_sessions')
    .select('id, started_at, ended_at, distance_m, duration_seconds, avg_pace_seconds_per_km')
    .eq('user_id', userId)
    .order('started_at', { ascending: false });

  if (error) {
    console.warn('[Runs] getRunSessions error:', error.message);
    return { data: [], error: error.message };
  }

  const sessions = data ?? [];
  console.log(`[Runs] getRunSessions count=${sessions.length} userId=${userId}`);

  return { data: sessions, error: null };
}

export async function getRunSessionById(
  runId: string,
  userId: string,
): Promise<{ data: RunSession | null; error: string | null }> {
  const { data, error } = await supabase
    .from('run_sessions')
    .select('id, started_at, ended_at, distance_m, duration_seconds, avg_pace_seconds_per_km')
    .eq('id', runId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

export async function getRunPointsByRunId(
  runId: string,
): Promise<{ data: RunPoint[]; error: string | null }> {
  const { data, error } = await supabase
    .from('run_points')
    .select('latitude, longitude, recorded_at, seq')
    .eq('run_id', runId)
    .order('seq', { ascending: true });

  if (error) {
    return { data: [], error: error.message };
  }

  return { data: data ?? [], error: null };
}

/** @deprecated use getRunSessions */
export const fetchRunSessions = getRunSessions;

/** @deprecated use getRunSessionById */
export async function fetchRunSessionById(
  runId: string,
): Promise<{ data: RunSession | null; error: string | null }> {
  const { data, error } = await supabase
    .from('run_sessions')
    .select('id, started_at, ended_at, distance_m, duration_seconds, avg_pace_seconds_per_km')
    .eq('id', runId)
    .maybeSingle();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

/** @deprecated use getRunPointsByRunId */
export const fetchRunPoints = getRunPointsByRunId;
