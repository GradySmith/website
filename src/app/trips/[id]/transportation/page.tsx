import { notFound } from "next/navigation";
import { Plane } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { ConfirmedBookingRow } from "@/components/ConfirmedBookingRow";
import { getTrip } from "@/lib/get-trip";
import { createClient } from "@/lib/supabase-server";
import { getServerPreferences } from "@/lib/preferences";
import { getUsdToCadRate } from "@/lib/exchange-rate";
import type { Booking } from "@/types";

export default async function TripTransportationPage({
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
  const [{ data: bookings }, { locale: _locale, currency }, exchangeRate] = await Promise.all([
    supabase
      .from("bookings")
      .select("*")
      .eq("trip_id", id)
      .is("deleted_at", null)
      .in("type", ["flight", "car"])
      .order("start_at", { ascending: true }),
    getServerPreferences(),
    getUsdToCadRate(),
  ]);

  const transportBookings = (bookings as Booking[]) ?? [];

  // The `bookings` table has no location column — that lives on the
  // mirrored itinerary_items row — so pull those in to pre-fill each
  // booking's edit form, same as the Bookings page does.
  const bookingIds = transportBookings.map((booking) => booking.id);
  const { data: linkedItems } = bookingIds.length
    ? await supabase
        .from("itinerary_items")
        .select("source_booking_id, location_name")
        .in("source_booking_id", bookingIds)
        .is("deleted_at", null)
    : { data: [] as { source_booking_id: string; location_name: string | null }[] };

  const locationByBookingId: Record<string, string> = {};
  for (const item of linkedItems ?? []) {
    if (item.source_booking_id) {
      locationByBookingId[item.source_booking_id as string] = (item.location_name as string) ?? "";
    }
  }

  const flights = transportBookings.filter((booking) => booking.type === "flight");
  const otherTransport = transportBookings.filter((booking) => booking.type === "car");

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-brand-muted">
        Every flight, train, bus, or other way you&apos;re getting around on this trip, in one
        place.
      </p>

      {transportBookings.length === 0 ? (
        <EmptyState
          icon={Plane}
          title="No flights or transportation yet"
          description="Confirm a flight or transportation booking from the Bookings page and it'll show up here."
        />
      ) : (
        <>
          {flights.length > 0 && (
            <div className="flex flex-col gap-3">
              <h2 className="font-display text-lg font-semibold text-brand-ink">
                Flights ({flights.length})
              </h2>
              <div className="flex flex-col gap-2">
                {flights.map((booking) => (
                  <ConfirmedBookingRow
                    key={booking.id}
                    booking={booking}
                    locationName={locationByBookingId[booking.id] ?? ""}
                    currency={currency}
                    exchangeRate={exchangeRate}
                  />
                ))}
              </div>
            </div>
          )}

          {otherTransport.length > 0 && (
            <div className="flex flex-col gap-3">
              <h2 className="font-display text-lg font-semibold text-brand-ink">
                Other transportation ({otherTransport.length})
              </h2>
              <div className="flex flex-col gap-2">
                {otherTransport.map((booking) => (
                  <ConfirmedBookingRow
                    key={booking.id}
                    booking={booking}
                    locationName={locationByBookingId[booking.id] ?? ""}
                    currency={currency}
                    exchangeRate={exchangeRate}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
