-- Biyahe: richer trip details (manual creation, budgeting) + day-by-day
-- itinerary items with map coordinates.
-- Run this once in the Supabase SQL Editor, after 0001_init.sql.

-- ---------------------------------------------------------------------
-- Trips: title/status/description for manually-created trips, plus
-- budget fields used by the Budget page.
-- ---------------------------------------------------------------------

alter table public.trips
  add column if not exists title text,
  add column if not exists status text not null default 'planning'
    check (status in ('planning', 'confirmed', 'completed')),
  add column if not exists description text,
  add column if not exists budget_amount numeric(10, 2),
  add column if not exists visa_fees numeric(10, 2) not null default 0,
  add column if not exists food_per_day numeric(10, 2) not null default 0,
  add column if not exists beverages_per_day numeric(10, 2) not null default 0,
  add column if not exists splurge_total numeric(10, 2) not null default 0;

-- ---------------------------------------------------------------------
-- Itinerary items: one row per activity on a specific day of a trip,
-- with an optional map location for the Map page.
-- ---------------------------------------------------------------------

create table if not exists public.itinerary_items (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  day_number integer not null check (day_number >= 1),
  title text not null,
  location_name text,
  latitude double precision,
  longitude double precision,
  start_time text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists itinerary_items_trip_id_idx
  on public.itinerary_items (trip_id);

alter table public.itinerary_items enable row level security;

create policy "Users can view itinerary items for their trips"
  on public.itinerary_items for select
  using (
    exists (
      select 1 from public.trips
      where trips.id = itinerary_items.trip_id and trips.user_id = auth.uid()
    )
  );

create policy "Users can insert itinerary items for their trips"
  on public.itinerary_items for insert
  with check (
    exists (
      select 1 from public.trips
      where trips.id = itinerary_items.trip_id and trips.user_id = auth.uid()
    )
  );

create policy "Users can update itinerary items for their trips"
  on public.itinerary_items for update
  using (
    exists (
      select 1 from public.trips
      where trips.id = itinerary_items.trip_id and trips.user_id = auth.uid()
    )
  );

create policy "Users can delete itinerary items for their trips"
  on public.itinerary_items for delete
  using (
    exists (
      select 1 from public.trips
      where trips.id = itinerary_items.trip_id and trips.user_id = auth.uid()
    )
  );
