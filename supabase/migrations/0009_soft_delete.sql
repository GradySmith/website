-- Biyahe: soft-delete for itinerary items and bookings, so deleting one
-- can be undone from a Trash view instead of being permanent immediately.
-- Run this once in the Supabase SQL Editor, after 0008_itinerary_flight_type.sql.

alter table public.itinerary_items
  add column if not exists deleted_at timestamptz;

alter table public.bookings
  add column if not exists deleted_at timestamptz;

create index if not exists itinerary_items_deleted_at_idx
  on public.itinerary_items (trip_id, deleted_at);

create index if not exists bookings_deleted_at_idx
  on public.bookings (trip_id, deleted_at);
