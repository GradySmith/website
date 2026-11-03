-- Biyahe: core schema for trips, bookings, and budget tracking.
-- Run this once in the Supabase SQL Editor (or via the Supabase CLI).

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------

create table if not exists public.trips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  destination text not null,
  start_date date,
  end_date date,
  cover_image_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  type text not null check (type in ('flight', 'hotel', 'activity', 'car', 'other')),
  title text not null,
  confirmation_number text,
  start_at timestamptz not null,
  end_at timestamptz,
  cost numeric(10, 2),
  currency text not null default 'USD',
  created_at timestamptz not null default now()
);

create table if not exists public.budget_lines (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  category text not null check (
    category in ('flights', 'lodging', 'food', 'activities', 'transport', 'other')
  ),
  label text not null,
  amount numeric(10, 2) not null,
  currency text not null default 'USD',
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------

create index if not exists trips_user_id_idx on public.trips (user_id);
create index if not exists bookings_trip_id_idx on public.bookings (trip_id);
create index if not exists budget_lines_trip_id_idx on public.budget_lines (trip_id);

-- ---------------------------------------------------------------------
-- Row Level Security: every user can only see/manage their own data.
-- Bookings and budget lines are scoped through their parent trip.
-- ---------------------------------------------------------------------

alter table public.trips enable row level security;
alter table public.bookings enable row level security;
alter table public.budget_lines enable row level security;

create policy "Users can view their own trips"
  on public.trips for select
  using (auth.uid() = user_id);

create policy "Users can insert their own trips"
  on public.trips for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own trips"
  on public.trips for update
  using (auth.uid() = user_id);

create policy "Users can delete their own trips"
  on public.trips for delete
  using (auth.uid() = user_id);

create policy "Users can view bookings for their trips"
  on public.bookings for select
  using (
    exists (
      select 1 from public.trips
      where trips.id = bookings.trip_id and trips.user_id = auth.uid()
    )
  );

create policy "Users can insert bookings for their trips"
  on public.bookings for insert
  with check (
    exists (
      select 1 from public.trips
      where trips.id = bookings.trip_id and trips.user_id = auth.uid()
    )
  );

create policy "Users can update bookings for their trips"
  on public.bookings for update
  using (
    exists (
      select 1 from public.trips
      where trips.id = bookings.trip_id and trips.user_id = auth.uid()
    )
  );

create policy "Users can delete bookings for their trips"
  on public.bookings for delete
  using (
    exists (
      select 1 from public.trips
      where trips.id = bookings.trip_id and trips.user_id = auth.uid()
    )
  );

create policy "Users can view budget lines for their trips"
  on public.budget_lines for select
  using (
    exists (
      select 1 from public.trips
      where trips.id = budget_lines.trip_id and trips.user_id = auth.uid()
    )
  );

create policy "Users can insert budget lines for their trips"
  on public.budget_lines for insert
  with check (
    exists (
      select 1 from public.trips
      where trips.id = budget_lines.trip_id and trips.user_id = auth.uid()
    )
  );

create policy "Users can update budget lines for their trips"
  on public.budget_lines for update
  using (
    exists (
      select 1 from public.trips
      where trips.id = budget_lines.trip_id and trips.user_id = auth.uid()
    )
  );

create policy "Users can delete budget lines for their trips"
  on public.budget_lines for delete
  using (
    exists (
      select 1 from public.trips
      where trips.id = budget_lines.trip_id and trips.user_id = auth.uid()
    )
  );
