-- Biyahe: link an itinerary item back to the confirmed booking it was
-- mirrored from, so editing that booking later (Bookings page) can also
-- update its Itinerary/Map entry instead of leaving it stale.
-- Run this once in the Supabase SQL Editor, after 0006_itinerary_item_type.sql.

alter table public.itinerary_items
  add column if not exists source_booking_id uuid references public.bookings(id) on delete set null;

create index if not exists itinerary_items_source_booking_id_idx
  on public.itinerary_items (source_booking_id);
