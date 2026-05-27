-- Myle running app schema
-- Supabase SQL Editor에 전체를 붙여넣고 Run 하세요.

-- ---------------------------------------------------------------------------
-- run_sessions: 러닝 세션 요약
-- ---------------------------------------------------------------------------
create table public.run_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  started_at timestamptz not null,
  ended_at timestamptz,
  distance_m numeric(10, 2) not null default 0 check (distance_m >= 0),
  duration_seconds integer not null default 0 check (duration_seconds >= 0),
  avg_pace_seconds_per_km numeric(8, 2) check (avg_pace_seconds_per_km is null or avg_pace_seconds_per_km >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint run_sessions_time_order check (
    ended_at is null or ended_at >= started_at
  )
);

comment on table public.run_sessions is '러닝 세션 요약 (시작/종료, 거리, 시간, 평균 페이스)';
comment on column public.run_sessions.distance_m is '총 거리 (미터)';
comment on column public.run_sessions.duration_seconds is '총 시간 (초)';
comment on column public.run_sessions.avg_pace_seconds_per_km is '평균 페이스 (km당 초)';

create index run_sessions_user_id_started_at_idx
  on public.run_sessions (user_id, started_at desc);

-- ---------------------------------------------------------------------------
-- run_points: GPS 트랙 포인트
-- ---------------------------------------------------------------------------
create table public.run_points (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.run_sessions (id) on delete cascade,
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  recorded_at timestamptz not null,
  seq integer not null check (seq >= 0),
  created_at timestamptz not null default now(),
  unique (run_id, seq)
);

comment on table public.run_points is '러닝 GPS 트랙 포인트';
comment on column public.run_points.seq is '세션 내 포인트 순서 (0부터)';

create index run_points_run_id_seq_idx
  on public.run_points (run_id, seq);

-- ---------------------------------------------------------------------------
-- updated_at 자동 갱신
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger run_sessions_set_updated_at
before update on public.run_sessions
for each row
execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.run_sessions enable row level security;
alter table public.run_points enable row level security;

-- run_sessions: 본인 데이터만 CRUD
create policy "run_sessions_select_own"
  on public.run_sessions
  for select
  to authenticated
  using (user_id = auth.uid());

create policy "run_sessions_insert_own"
  on public.run_sessions
  for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "run_sessions_update_own"
  on public.run_sessions
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "run_sessions_delete_own"
  on public.run_sessions
  for delete
  to authenticated
  using (user_id = auth.uid());

-- run_points: 본인 run_sessions에 속한 포인트만 CRUD
create policy "run_points_select_own"
  on public.run_points
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.run_sessions rs
      where rs.id = run_points.run_id
        and rs.user_id = auth.uid()
    )
  );

create policy "run_points_insert_own"
  on public.run_points
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.run_sessions rs
      where rs.id = run_points.run_id
        and rs.user_id = auth.uid()
    )
  );

create policy "run_points_update_own"
  on public.run_points
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.run_sessions rs
      where rs.id = run_points.run_id
        and rs.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.run_sessions rs
      where rs.id = run_points.run_id
        and rs.user_id = auth.uid()
    )
  );

create policy "run_points_delete_own"
  on public.run_points
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.run_sessions rs
      where rs.id = run_points.run_id
        and rs.user_id = auth.uid()
    )
  );
