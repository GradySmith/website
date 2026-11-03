-- Biyahe: itinerary item type, so the trip Map tab can tell accommodation
-- apart from planned activities (Home icon vs flag icon).
-- Run this once in the Supabase SQL Editor, after 0005_user_preferences.sql.

alter table public.itinerary_items
  add column if not exists item_type text not null default 'activity'
    check (item_type in ('activity', 'accommodation'));
