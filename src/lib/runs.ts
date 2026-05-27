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

export async function fetchRunSessions(
  userId: string,
): Promise<{ data: RunSession[]; error: string | null }> {
  const { data, error } = await supabase
    .from('run_sessions')
    .select('id, started_at, ended_at, distance_m, duration_seconds, avg_pace_seconds_per_km')
    .eq('user_id', userId)
    .order('started_at', { ascending: false });

  if (error) {
    return { data: [], error: error.message };
  }

  return { data: data ?? [], error: null };
}

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

export async function fetchRunPoints(
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
