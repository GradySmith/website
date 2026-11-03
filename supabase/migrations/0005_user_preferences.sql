-- Biyahe: per-user language + currency preference.
-- Run this once in the Supabase SQL Editor, after 0004_destination_photo_cache.sql.

create table if not exists public.user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  locale text not null default 'en' check (locale in ('en', 'fr')),
  currency text not null default 'USD' check (currency in ('USD', 'CAD')),
  updated_at timestamptz not null default now()
);

alter table public.user_preferences enable row level security;

create policy "Users can view their own preferences"
  on public.user_preferences for select
  using (auth.uid() = user_id);

create policy "Users can insert their own preferences"
  on public.user_preferences for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own preferences"
  on public.user_preferences for update
  using (auth.uid() = user_id);
