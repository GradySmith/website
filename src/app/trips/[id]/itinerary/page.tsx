import { notFound } from "next/navigation";
import { ItineraryDayList } from "@/components/ItineraryDayList";
import { DuplicateBookingsBanner } from "@/components/DuplicateBookingsBanner";
import { getTrip } from "@/lib/get-trip";
import { createClient } from "@/lib/supabase-server";
import { parseDateOnly } from "@/lib/date-only";
import { findPossibleDuplicateBookings } from "@/lib/duplicate-bookings";
import type { Booking, ItineraryItem, TripDay } from "@/types";

function tripDurationDays(startDate: string | null, endDate: string | null): number | null {
  if (!startDate || !endDate) return null;
  const start = parseDateOnly(startDate);
  const end = parseDateOnly(endDate);
  const diffMs = end.getTime() - start.getTime();
  return Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1);
}

export default async function TripItineraryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const trip = await getTrip(id);

  if (!trip) {
    notFound();
  }

  const supabase = await createClient();
  const [{ data: items }, { data: tripBookings }, { data: dayNicknames }] = await Promise.all([
    supabase
      .from("itinerary_items")
      .select("*")
      .eq("trip_id", id)
      .is("deleted_at", null)
      .order("day_number", { ascending: true })
      .order("sort_order", { ascending: true }),
    supabase.from("bookings").select("*").eq("trip_id", id).is("deleted_at", null),
    supabase.from("trip_days").select("*").eq("trip_id", id),
  ]);

  const totalDaysFromDates = tripDurationDays(trip.start_date, trip.end_date);
  const duplicatePairs = findPossibleDuplicateBookings((tripBookings as Booking[]) ?? []);

  const nicknamesByDay: Record<number, string> = {};
  for (const day of (dayNicknames as TripDay[]) ?? []) {
    if (day.nickname) nicknamesByDay[day.day_number] = day.nickname;
  }

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-brand-muted">
        {trip.start_date && trip.end_date
          ? "Every day of the trip is listed below — add accommodation or activities straight onto the date you want."
          : "Set start and end dates on this trip to see calendar dates here. For now, add days as you plan them."}
      </p>

      {duplicatePairs.length > 0 && <DuplicateBookingsBanner pairs={duplicatePairs} />}

      <ItineraryDayList
        tripId={id}
        items={(items as ItineraryItem[]) ?? []}
        startDate={trip.start_date}
        totalDaysFromDates={totalDaysFromDates}
        nicknamesByDay={nicknamesByDay}
      />
    </div>
  );
}
