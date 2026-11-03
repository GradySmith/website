-- Biyahe: Gmail inbox sync for auto-detecting flight/hotel bookings.
-- Run this once in the Supabase SQL Editor, after 0002_trip_details.sql.

-- ---------------------------------------------------------------------
-- email_connections: one row per user per connected inbox provider,
-- holding the OAuth tokens needed to call the provider's API on their
-- behalf. One connection per (user, provider).
-- ---------------------------------------------------------------------

create table if not exists public.email_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null default 'google' check (provider in ('google', 'microsoft')),
  access_token text,
  refresh_token text,
  connected_at timestamptz not null default now(),
  last_scanned_at timestamptz,
  unique (user_id, provider)
);

alter table public.email_connections enable row level security;

create policy "Users can view their own email connections"
  on public.email_connections for select
  using (auth.uid() = user_id);

create policy "Users can insert their own email connections"
  on public.email_connections for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own email connections"
  on public.email_connections for update
  using (auth.uid() = user_id);

create policy "Users can delete their own email connections"
  on public.email_connections for delete
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------
-- detected_bookings: staging area for bookings found in a user's inbox.
-- Nothing here touches the real `bookings` table until the user reviews
-- and confirms it (optionally attaching it to a trip, or creating one).
-- ---------------------------------------------------------------------

create table if not exists public.detected_bookings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  trip_id uuid references public.trips(id) on delete set null,
  source_message_id text not null,
  type text not null default 'other' check (type in ('flight', 'hotel', 'activity', 'car', 'other')),
  title text not null,
  confirmation_number text,
  start_at timestamptz,
  end_at timestamptz,
  cost numeric(10, 2),
  currency text not null default 'USD',
  destination_guess text,
  raw_snippet text,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'dismissed')),
  created_at timestamptz not null default now(),
  unique (user_id, source_message_id)
);

create index if not exists detected_bookings_user_status_idx
  on public.detected_bookings (user_id, status);

alter table public.detected_bookings enable row level security;

create policy "Users can view their own detected bookings"
  on public.detected_bookings for select
  using (auth.uid() = user_id);

create policy "Users can insert their own detected bookings"
  on public.detected_bookings for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own detected bookings"
  on public.detected_bookings for update
  using (auth.uid() = user_id);

create policy "Users can delete their own detected bookings"
  on public.detected_bookings for delete
  using (auth.uid() = user_id);
