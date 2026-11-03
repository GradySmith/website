-- Biyahe: flights mirrored from confirmed bookings were being tagged
-- item_type='activity' (only activity/accommodation existed), showing a
-- generic Flag icon on the Itinerary/Map tabs instead of a plane. Adds
-- 'flight' as a third value.
-- Run this once in the Supabase SQL Editor, after 0007_itinerary_source_booking.sql.

alter table public.itinerary_items
  drop constraint if exists itinerary_items_item_type_check;

alter table public.itinerary_items
  add constraint itinerary_items_item_type_check
    check (item_type in ('activity', 'accommodation', 'flight'));
