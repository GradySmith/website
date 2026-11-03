import Link from "next/link";
import { notFound } from "next/navigation";
import { Wallet, Plane, Home, MapPinned, ListChecks, ArrowRight } from "lucide-react";
import { getTrip } from "@/lib/get-trip";
import { createClient } from "@/lib/supabase-server";
import { getServerPreferences } from "@/lib/preferences";
import { getUsdToCadRate } from "@/lib/exchange-rate";
import { formatCurrency } from "@/lib/currency-format";
import { EditTripPhotoButton } from "@/components/EditTripPhotoButton";
import { TripDatesEditor } from "@/components/TripDatesEditor";
import type { Booking } from "@/types";

export default async function TripOverviewPage({
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

  const [
    { data: flightBookings },
    { data: stayBookings },
    { count: itemCount },
    { data: dayRows },
    { currency },
    exchangeRate,
  ] = await Promise.all([
    supabase
      .from("bookings")
      .select("*")
      .eq("trip_id", id)
      .eq("type", "flight")
      .is("deleted_at", null)
      .order("start_at", { ascending: true }),
    supabase
      .from("bookings")
      .select("*")
      .eq("trip_id", id)
      .eq("type", "hotel")
      .is("deleted_at", null)
      .order("start_at", { ascending: true }),
    supabase
      .from("itinerary_items")
      .select("id", { count: "exact", head: true })
      .eq("trip_id", id)
      .is("deleted_at", null),
    supabase
      .from("itinerary_items")
      .select("day_number")
      .eq("trip_id", id)
      .is("deleted_at", null),
    getServerPreferences(),
    getUsdToCadRate(),
  ]);

  const flights = (flightBookings as Booking[]) ?? [];
  const stays = (stayBookings as Booking[]) ?? [];
  const daysPlanned = new Set((dayRows ?? []).map((row) => row.day_number as number)).size;

  // Shows a check-in – check-out range for a multi-night stay instead of
  // just the start date.
  function formatStayDateLabel(booking: Booking): string {
    const startLabel = new Date(booking.start_at).toLocaleDateString("en-US", { timeZone: "UTC" });
    if (!booking.end_at) return startLabel;
    const startDateOnly = booking.start_at.slice(0, 10);
    const endDateOnly = booking.end_at.slice(0, 10);
    if (endDateOnly <= startDateOnly) return startLabel;
    const endLabel = new Date(booking.end_at).toLocaleDateString("en-US", { timeZone: "UTC" });
    return `${startLabel} – ${endLabel}`;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="relative h-56 w-full overflow-hidden rounded-2xl bg-brand-teal-50">
        {trip.cover_image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={trip.cover_image_url}
            alt={trip.destination}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-brand-teal-300">
            <MapPinned className="h-8 w-8" strokeWidth={1.5} />
          </div>
        )}
        <EditTripPhotoButton tripId={id} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Link
          href={`/trips/${id}/itinerary`}
          className="flex flex-col gap-1 rounded-2xl border border-brand-teal-100 bg-white p-4 transition-colors hover:border-brand-teal-300"
        >
          <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-brand-muted">
            <ListChecks className="h-3.5 w-3.5" />
            Itinerary
          </span>
          <span className="font-display text-2xl font-semibold text-brand-ink">
            {itemCount ?? 0}
          </span>
          <span className="text-xs text-brand-muted">
            {itemCount ? `across ${daysPlanned} day${daysPlanned === 1 ? "" : "s"}` : "activities planned"}
          </span>
        </Link>

        <Link
          href={`/trips/${id}/budget`}
          className="flex flex-col gap-1 rounded-2xl border border-brand-teal-100 bg-white p-4 transition-colors hover:border-brand-teal-300"
        >
          <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-brand-muted">
            <Wallet className="h-3.5 w-3.5" />
            Budget
          </span>
          <span className="font-display text-2xl font-semibold text-brand-ink">
            {trip.budget_amount != null
              ? formatCurrency(trip.budget_amount, currency, exchangeRate)
              : "—"}
          </span>
          <span className="text-xs text-brand-muted">
            {trip.budget_amount != null ? "target budget" : "no budget set yet"}
          </span>
        </Link>

        <Link
          href={`/trips/${id}/map`}
          className="flex flex-col gap-1 rounded-2xl border border-brand-teal-100 bg-white p-4 transition-colors hover:border-brand-teal-300"
        >
          <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-brand-muted">
            <MapPinned className="h-3.5 w-3.5" />
            Route map
          </span>
          <span className="font-display text-2xl font-semibold text-brand-ink">View</span>
          <span className="text-xs text-brand-muted">accommodation &amp; activities</span>
        </Link>
      </div>

      <div className="flex flex-col gap-4 rounded-2xl border border-brand-teal-100 bg-white p-6">
        <h2 className="font-display text-lg font-semibold text-brand-ink">Trip details</h2>

        <TripDatesEditor tripId={id} startDate={trip.start_date} endDate={trip.end_date} />

        {trip.description ? (
          <p className="text-sm text-brand-ink">{trip.description}</p>
        ) : (
          <p className="text-sm text-brand-muted">No description yet.</p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-4 rounded-2xl border border-brand-teal-100 bg-white p-6">
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-brand-ink">
            <Plane className="h-4 w-4 text-brand-teal-600" />
            Flights
          </h2>

          {flights.length === 0 ? (
            <p className="text-sm text-brand-muted">
              No flights yet — connect Gmail on the Bookings page and confirmed
              flights for this trip will show up here.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {flights.map((flight) => (
                <div
                  key={flight.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-brand-teal-100 px-3 py-2.5 text-sm"
                >
                  <div>
                    <p className="font-medium text-brand-ink">{flight.title}</p>
                    <p className="text-xs text-brand-muted">
                      {new Date(flight.start_at).toLocaleDateString("en-US", { timeZone: "UTC" })}
                      {flight.confirmation_number && ` · #${flight.confirmation_number}`}
                    </p>
                  </div>
                  {flight.cost != null && (
                    <span className="flex-shrink-0 font-medium text-brand-ink">
                      {formatCurrency(flight.cost, currency, exchangeRate)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          <Link
            href="/bookings"
            className="flex items-center gap-1 self-start text-sm font-medium text-brand-teal-700 hover:text-brand-teal-800"
          >
            Manage bookings
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="flex flex-col gap-4 rounded-2xl border border-brand-teal-100 bg-white p-6">
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-brand-ink">
            <Home className="h-4 w-4 text-brand-teal-600" />
            Accommodations
          </h2>

          {stays.length === 0 ? (
            <p className="text-sm text-brand-muted">
              No accommodations yet — connect Gmail, scan a screenshot, or add one
              from the Bookings page and confirmed stays for this trip will show
              up here with their full check-in – check-out range.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {stays.map((stay) => (
                <div
                  key={stay.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-brand-teal-100 px-3 py-2.5 text-sm"
                >
                  <div>
                    <p className="font-medium text-brand-ink">{stay.title}</p>
                    <p className="text-xs text-brand-muted">
                      {formatStayDateLabel(stay)}
                      {stay.confirmation_number && ` · #${stay.confirmation_number}`}
                    </p>
                  </div>
                  {stay.cost != null && (
                    <span className="flex-shrink-0 font-medium text-brand-ink">
                      {formatCurrency(stay.cost, currency, exchangeRate)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          <Link
            href="/bookings"
            className="flex items-center gap-1 self-start text-sm font-medium text-brand-teal-700 hover:text-brand-teal-800"
          >
            Manage bookings
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
