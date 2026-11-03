-- Biyahe: cache for Discover destination photos.
-- Run this once in the Supabase SQL Editor, after 0003_email_sync.sql.
--
-- Since src/data/curated-destinations.ts constrains Discover to a fixed,
-- fairly small pool of destinations, most searches end up re-suggesting a
-- place that's already been looked up before. This table lets the first
-- lookup for a destination (live Pexels/Openverse fetch) get reused by
-- every search after that, instead of re-fetching every time.
--
-- Not scoped to a single user — it's shared, non-sensitive data (public
-- photo URLs + credits), so RLS just requires being signed in at all.

create table if not exists public.destination_photos (
  destination_key text primary key,
  name text not null,
  country text not null,
  photos jsonb not null default '[]'::jsonb,
  fetched_at timestamptz not null default now()
);

alter table public.destination_photos enable row level security;

create policy "Signed-in users can read cached destination photos"
  on public.destination_photos for select
  using (auth.uid() is not null);

create policy "Signed-in users can insert cached destination photos"
  on public.destination_photos for insert
  with check (auth.uid() is not null);

create policy "Signed-in users can update cached destination photos"
  on public.destination_photos for update
  using (auth.uid() is not null);
