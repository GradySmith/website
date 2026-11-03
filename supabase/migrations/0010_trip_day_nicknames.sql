-- Biyahe: let users nickname individual days of a trip (e.g. "Beach day",
-- "Museum hopping") so the itinerary accordion header shows more than a
-- bare day number. Days themselves aren't a real entity anywhere else in
-- the schema (they're derived from trip dates / day_number on the fly),
-- so this is a sparse table: only days someone has actually nicknamed get
-- a row.

create table if not exists public.trip_days (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  day_number integer not null check (day_number >= 1),
  nickname text,
  created_at timestamptz not null default now(),
  unique (trip_id, day_number)
);

create index if not exists trip_days_trip_id_idx
  on public.trip_days (trip_id);

alter table public.trip_days enable row level security;

create policy "Users can view day nicknames for their trips"
  on public.trip_days for select
  using (
    exists (
      select 1 from public.trips
      where trips.id = trip_days.trip_id and trips.user_id = auth.uid()
    )
  );

create policy "Users can insert day nicknames for their trips"
  on public.trip_days for insert
  with check (
    exists (
      select 1 from public.trips
      where trips.id = trip_days.trip_id and trips.user_id = auth.uid()
    )
  );

create policy "Users can update day nicknames for their trips"
  on public.trip_days for update
  using (
    exists (
      select 1 from public.trips
      where trips.id = trip_days.trip_id and trips.user_id = auth.uid()
    )
  );

create policy "Users can delete day nicknames for their trips"
  on public.trip_days for delete
  using (
    exists (
      select 1 from public.trips
      where trips.id = trip_days.trip_id and trips.user_id = auth.uid()
    )
  );
