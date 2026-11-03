"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase-server";
import { geocodeLocation } from "@/lib/geocode";
import { getDestinationPhotos } from "@/lib/destination-photos";
import { parseDateOnly } from "@/lib/date-only";
import type { ItineraryItemType, TravelStyle } from "@/types";

type ActionResult<T = undefined> =
  | ({ success: true } & (T extends undefined ? object : { data: T }))
  | { success: false; error: string };

async function requireUserId(): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return (data?.claims?.sub as string | undefined) ?? null;
}

// Splits a free-text destination like "Krakow, Poland" into a name/country
// pair for the photo lookup below — falls back to using the whole string
// as the name when there's no comma (e.g. just "Iceland").
function splitDestination(destination: string): { name: string; country: string } {
  const [name, ...rest] = destination.split(",").map((part) => part.trim());
  return { name: name || destination.trim(), country: rest.join(", ") };
}

// Every trip should show up with a photo in My Trips, not just ones saved
// from a Discover suggestion. Best-effort — a failed/slow photo lookup
// should never block trip creation, so this always resolves to a value
// (null on failure) rather than throwing.
async function findCoverPhoto(
  supabase: Awaited<ReturnType<typeof createClient>>,
  destination: string
): Promise<string | null> {
  try {
    const { name, country } = splitDestination(destination);
    const photos = await getDestinationPhotos(supabase, name, country);
    return photos[0]?.url ?? null;
  } catch (error) {
    console.error(`Couldn't fetch a cover photo for "${destination}":`, error);
    return null;
  }
}

// Used by the Discover page — creates a trip from an AI suggestion, with
// just a destination and cover photo. Dates/budget get filled in later.
export async function saveTrip({
  destination,
  coverImageUrl,
}: {
  destination: string;
  coverImageUrl?: string;
}): Promise<ActionResult<{ tripId: string }>> {
  const supabase = await createClient();
  const userId = await requireUserId();

  if (!userId) {
    return { success: false, error: "You need to be signed in to save trips." };
  }

  const resolvedCoverImageUrl = coverImageUrl ?? (await findCoverPhoto(supabase, destination));

  const { data, error } = await supabase
    .from("trips")
    .insert({
      user_id: userId,
      destination,
      title: destination,
      cover_image_url: resolvedCoverImageUrl,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { success: false, error: error?.message ?? "Couldn't save this trip." };
  }

  revalidatePath("/trips");
  return { success: true, data: { tripId: data.id as string } };
}

// Used by the "+ New trip" modal on My Trips — a fully manual trip, no
// AI suggestion involved.
export async function createTrip({
  title,
  destination,
  startDate,
  endDate,
}: {
  title: string;
  destination: string;
  startDate?: string;
  endDate?: string;
  travelStyle?: TravelStyle;
}): Promise<ActionResult<{ tripId: string }>> {
  const supabase = await createClient();
  const userId = await requireUserId();

  if (!userId) {
    return { success: false, error: "You need to be signed in to create a trip." };
  }

  if (!title.trim() || !destination.trim()) {
    return { success: false, error: "Trip title and destination are required." };
  }

  const coverImageUrl = await findCoverPhoto(supabase, destination);

  const { data, error } = await supabase
    .from("trips")
    .insert({
      user_id: userId,
      title,
      destination,
      start_date: startDate || null,
      end_date: endDate || null,
      cover_image_url: coverImageUrl,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { success: false, error: error?.message ?? "Couldn't create this trip." };
  }

  revalidatePath("/trips");
  return { success: true, data: { tripId: data.id as string } };
}

export async function updateTripTitle({
  tripId,
  title,
}: {
  tripId: string;
  title: string;
}): Promise<ActionResult> {
  const supabase = await createClient();

  if (!title.trim()) {
    return { success: false, error: "Trip title can't be empty." };
  }

  const { error } = await supabase
    .from("trips")
    .update({ title: title.trim() })
    .eq("id", tripId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/trips");
  revalidatePath(`/trips/${tripId}`);
  return { success: true };
}

// Sets or clears the nickname shown in an itinerary day's accordion header
// (e.g. "Beach day"). Days aren't a real row anywhere else — they're
// derived from the trip's dates — so this upserts a sparse trip_days row,
// only for days someone has actually named.
export async function updateDayNickname({
  tripId,
  dayNumber,
  nickname,
}: {
  tripId: string;
  dayNumber: number;
  nickname: string;
}): Promise<ActionResult> {
  const supabase = await createClient();
  const trimmed = nickname.trim();

  const { error } = await supabase
    .from("trip_days")
    .upsert(
      { trip_id: tripId, day_number: dayNumber, nickname: trimmed || null },
      { onConflict: "trip_id,day_number" }
    );

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath(`/trips/${tripId}/itinerary`);
  return { success: true };
}

// Edits a trip's start/end dates from the Overview tab. If the start date
// moves, every existing itinerary item's day number shifts by the same
// gap first, so each one stays pinned to the same real calendar date it
// was already on rather than silently landing on a different day.
export async function updateTripDates({
  tripId,
  startDate,
  endDate,
}: {
  tripId: string;
  startDate: string | null;
  endDate: string | null;
}): Promise<ActionResult> {
  const supabase = await createClient();

  if (startDate && endDate && startDate > endDate) {
    return { success: false, error: "Start date must be before end date." };
  }

  const { data: tripRow } = await supabase
    .from("trips")
    .select("start_date")
    .eq("id", tripId)
    .single();

  const oldStartDate = tripRow?.start_date as string | null | undefined;

  if (oldStartDate && startDate && oldStartDate !== startDate) {
    const shiftDays = Math.round(
      (parseDateOnly(oldStartDate).getTime() - parseDateOnly(startDate).getTime()) /
        (1000 * 60 * 60 * 24)
    );
    if (shiftDays !== 0) {
      const { data: existingItems } = await supabase
        .from("itinerary_items")
        .select("id, day_number, end_day_number")
        .eq("trip_id", tripId)
        .is("deleted_at", null);
      if (existingItems && existingItems.length > 0) {
        await Promise.all(
          existingItems.map((item) =>
            supabase
              .from("itinerary_items")
              .update({
                day_number: Math.max(1, (item.day_number as number) + shiftDays),
                end_day_number:
                  item.end_day_number != null
                    ? Math.max(1, (item.end_day_number as number) + shiftDays)
                    : null,
              })
              .eq("id", item.id)
          )
        );
      }
    }
  }

  const { error } = await supabase
    .from("trips")
    .update({ start_date: startDate, end_date: endDate })
    .eq("id", tripId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/trips");
  revalidatePath(`/trips/${tripId}`);
  revalidatePath(`/trips/${tripId}/itinerary`);
  revalidatePath(`/trips/${tripId}/budget`);
  revalidatePath(`/trips/${tripId}/map`);
  return { success: true };
}

// Photo options for the "change photo" picker on a trip's Overview tab —
// reuses the same cached destination lookup as trip creation, so this is
// instant after the first-ever fetch for that destination.
export async function getTripPhotoOptions(
  tripId: string
): Promise<ActionResult<{ photos: string[] }>> {
  const supabase = await createClient();

  const { data: trip, error } = await supabase
    .from("trips")
    .select("destination")
    .eq("id", tripId)
    .single();

  if (error || !trip) {
    return { success: false, error: error?.message ?? "Trip not found." };
  }

  const { name, country } = splitDestination(trip.destination as string);
  const photos = await getDestinationPhotos(supabase, name, country);
  return { success: true, data: { photos: photos.map((photo) => photo.url) } };
}

export async function updateTripCoverPhoto({
  tripId,
  coverImageUrl,
}: {
  tripId: string;
  coverImageUrl: string;
}): Promise<ActionResult> {
  const supabase = await createClient();

  if (!coverImageUrl.trim()) {
    return { success: false, error: "Enter a photo URL." };
  }

  const { error } = await supabase
    .from("trips")
    .update({ cover_image_url: coverImageUrl.trim() })
    .eq("id", tripId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/trips");
  revalidatePath(`/trips/${tripId}`);
  return { success: true };
}

export async function deleteTrip(tripId: string) {
  const supabase = await createClient();

  const { error } = await supabase.from("trips").delete().eq("id", tripId);

  if (error) {
    console.error("deleteTrip error:", error.message);
  }

  revalidatePath("/trips");
}

export async function updateTripBudget({
  tripId,
  budgetAmount,
  visaFees,
  foodPerDay,
  beveragesPerDay,
  splurgeTotal,
}: {
  tripId: string;
  budgetAmount?: number | null;
  visaFees?: number;
  foodPerDay?: number;
  beveragesPerDay?: number;
  splurgeTotal?: number;
}): Promise<ActionResult> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("trips")
    .update({
      budget_amount: budgetAmount ?? null,
      visa_fees: visaFees ?? 0,
      food_per_day: foodPerDay ?? 0,
      beverages_per_day: beveragesPerDay ?? 0,
      splurge_total: splurgeTotal ?? 0,
    })
    .eq("id", tripId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/budget");
  revalidatePath(`/trips/${tripId}/budget`);
  revalidatePath(`/trips/${tripId}`);
  return { success: true };
}

// Geocodes the location name (OpenStreetMap Nominatim — free, no API
// key) so the Map page can plot it, then inserts the itinerary item.
export async function addItineraryItem({
  tripId,
  dayNumber,
  endDayNumber,
  title,
  locationName,
  startTime,
  itemType = "activity",
}: {
  tripId: string;
  dayNumber: number;
  endDayNumber?: number;
  title: string;
  locationName?: string;
  startTime?: string;
  itemType?: ItineraryItemType;
}): Promise<ActionResult> {
  const supabase = await createClient();

  if (!title.trim()) {
    return { success: false, error: "Activity title is required." };
  }

  const [geocoded, { count }] = await Promise.all([
    locationName ? geocodeLocation(locationName) : Promise.resolve(null),
    supabase
      .from("itinerary_items")
      .select("id", { count: "exact", head: true })
      .eq("trip_id", tripId)
      .eq("day_number", dayNumber)
      .is("deleted_at", null),
  ]);

  const { error } = await supabase.from("itinerary_items").insert({
    trip_id: tripId,
    day_number: dayNumber,
    // A range only means anything when the end day is actually after the
    // start — otherwise this is a normal single-day item.
    end_day_number: endDayNumber && endDayNumber > dayNumber ? endDayNumber : null,
    title,
    location_name: locationName || null,
    latitude: geocoded?.latitude ?? null,
    longitude: geocoded?.longitude ?? null,
    start_time: startTime || null,
    sort_order: count ?? 0,
    item_type: itemType,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath(`/trips/${tripId}`);
  revalidatePath(`/trips/${tripId}/itinerary`);
  revalidatePath(`/trips/${tripId}/map`);
  return { success: true };
}

// Edits an existing itinerary item in place — title, which day it falls
// on, time, location (re-geocoded so the Map pin follows), and type.
export async function updateItineraryItem({
  tripId,
  itemId,
  title,
  dayNumber,
  endDayNumber,
  locationName,
  startTime,
  itemType,
}: {
  tripId: string;
  itemId: string;
  title: string;
  dayNumber: number;
  endDayNumber?: number;
  locationName?: string;
  startTime?: string;
  itemType: ItineraryItemType;
}): Promise<ActionResult> {
  const supabase = await createClient();

  if (!title.trim()) {
    return { success: false, error: "Title is required." };
  }

  const geocoded = locationName?.trim() ? await geocodeLocation(locationName.trim()) : null;

  const { error } = await supabase
    .from("itinerary_items")
    .update({
      title: title.trim(),
      day_number: dayNumber,
      end_day_number: endDayNumber && endDayNumber > dayNumber ? endDayNumber : null,
      location_name: locationName?.trim() || null,
      latitude: geocoded?.latitude ?? null,
      longitude: geocoded?.longitude ?? null,
      start_time: startTime?.trim() || null,
      item_type: itemType,
    })
    .eq("id", itemId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath(`/trips/${tripId}`);
  revalidatePath(`/trips/${tripId}/itinerary`);
  revalidatePath(`/trips/${tripId}/map`);
  return { success: true };
}

// Soft-delete — sets deleted_at instead of removing the row, so it can be
// found and restored from the trip's Trash view.
export async function deleteItineraryItem(tripId: string, itemId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("itinerary_items")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", itemId);

  if (error) {
    console.error("deleteItineraryItem error:", error.message);
  }

  revalidatePath(`/trips/${tripId}`);
  revalidatePath(`/trips/${tripId}/itinerary`);
  revalidatePath(`/trips/${tripId}/map`);
  revalidatePath("/trash");
}

export async function restoreItineraryItem(tripId: string, itemId: string): Promise<ActionResult> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("itinerary_items")
    .update({ deleted_at: null })
    .eq("id", itemId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath(`/trips/${tripId}`);
  revalidatePath(`/trips/${tripId}/itinerary`);
  revalidatePath(`/trips/${tripId}/map`);
  revalidatePath("/trash");
  return { success: true };
}
