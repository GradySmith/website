-- Biyahe: let an itinerary item span multiple days — primarily for
-- multi-night accommodation stays, so a hostel/hotel booking shows up on
-- every day of the stay in the Itinerary tab, not just the check-in day.
-- Null means "single day" (same as before); everything that already
-- exists is unaffected.

alter table public.itinerary_items
  add column if not exists end_day_number integer;

alter table public.itinerary_items
  drop constraint if exists itinerary_items_end_day_number_check;

alter table public.itinerary_items
  add constraint itinerary_items_end_day_number_check
  check (end_day_number is null or end_day_number >= day_number);
