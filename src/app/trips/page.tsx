import Link from "next/link";
import { Map, MapPin, Calendar, Wallet, ArrowRight, Trash2, Plane, Home, Ticket } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { TripStatusBadge } from "@/components/TripStatusBadge";
import { CreateTripModal } from "@/components/CreateTripModal";
import { createClient } from "@/lib/supabase-server";
import { deleteTrip } from "./actions";
import { getServerPreferences } from "@/lib/preferences";
import { getUsdToCadRate } from "@/lib/exchange-rate";
import { formatCurrency } from "@/lib/currency-format";
import { getDestinationPhotos } from "@/lib/destination-photos";
import { parseDateOnly } from "@/lib/date-only";
import { t } from "@/lib/i18n";
import type { Booking, Trip } from "@/types";

// Splits a free-text destination like "Krakow, Poland" into a name/country
// pair for the photo lookup — falls back to the whole string as the name
// when there's no comma (e.g. just "Iceland").
function splitDestination(destination: string): { name: string; country: string } {
  const [name, ...rest] = destination.split(",").map((part) => part.trim());
  return { name: name || destination.trim(), country: rest.join(", ") };
}

// Same 3-way bucketing as the Budget tab: flight, accommodation ("hotel"
// in the DB), everything else counts as an activity.
function bookingSummary(bookings: Booking[]) {
  const flights = bookings.filter((b) => b.type === "flight").length;
  const accommodation = bookings.filter((b) => b.type === "hotel").length;
  const activities = bookings.filter((b) => b.type !== "flight" && b.type !== "hotel").length;
  return { flights, accommodation, activities };
}

function tripDurationDays(trip: Trip): number | null {
  if (!trip.start_date || !trip.end_date) return null;
  const start = parseDateOnly(trip.start_date);
  const end = parseDateOnly(trip.end_date);
  const diffMs = end.getTime() - start.getTime();
  return Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1);
}

function formatDateRange(trip: Trip): string | null {
  if (!trip.start_date || !trip.end_date) return null;
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  const start = parseDateOnly(trip.start_date).toLocaleDateString("en-US", opts);
  const end = parseDateOnly(trip.end_date).toLocaleDateString("en-US", opts);
  return `${start} – ${end}`;
}

export default async function TripsPage() {
  const supabase = await createClient();

  const [{ data }, { locale, currency }, exchangeRate] = await Promise.all([
    supabase.auth.getClaims(),
    getServerPreferences(),
    getUsdToCadRate(),
  ]);
  const userId = data?.claims?.sub as string | undefined;

  const { data: trips, error } = await supabase
    .from("trips")
    .select("*")
    .eq("user_id", userId ?? "")
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
        Couldn&apos;t load your trips: {error.message}
      </p>
    );
  }

  const tripsList = (trips as Trip[] | null) ?? [];

  // Every trip should show up with a photo — self-heal any that don't
  // have one yet (trips created before this existed, or where the photo
  // lookup failed at creation time) so they never stay stuck without one.
  const tripsMissingPhotos = tripsList.filter((trip) => !trip.cover_image_url);
  if (tripsMissingPhotos.length > 0) {
    await Promise.all(
      tripsMissingPhotos.map(async (trip) => {
        try {
          const { name, country } = splitDestination(trip.destination);
          const photos = await getDestinationPhotos(supabase, name, country);
          const coverImageUrl = photos[0]?.url;
          if (coverImageUrl) {
            await supabase.from("trips").update({ cover_image_url: coverImageUrl }).eq("id", trip.id);
            trip.cover_image_url = coverImageUrl;
          }
        } catch (photoError) {
          console.error(`Couldn't backfill a cover photo for trip "${trip.id}":`, photoError);
        }
      })
    );
  }

  const tripIds = tripsList.map((trip) => trip.id);
  const { data: allBookings } = tripIds.length
    ? await supabase.from("bookings").select("*").in("trip_id", tripIds).is("deleted_at", null)
    : { data: [] as Booking[] };

  // Plain object, not a Map — "Map" here would collide with the lucide-react
  // Map icon imported above.
  const bookingsByTripId: Record<string, Booking[]> = {};
  for (const booking of (allBookings as Booking[]) ?? []) {
    const list = bookingsByTripId[booking.trip_id] ?? [];
    list.push(booking);
    bookingsByTripId[booking.trip_id] = list;
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold text-brand-ink">
            {t(locale, "trips_heading")}
          </h1>
          <p className="mt-1 text-sm text-brand-muted">
            {t(locale, "trips_subheading")}
          </p>
        </div>
        <CreateTripModal />
      </div>

      {tripsList.length === 0 ? (
        <EmptyState
          icon={Map}
          title="No trips yet"
          description={
            'Hit "New trip" above to start one from scratch, or head to Discover and save a destination you like.'
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tripsList.map((trip) => {
            const days = tripDurationDays(trip);
            const dateRange = formatDateRange(trip);
            const summary = bookingSummary(bookingsByTripId[trip.id] ?? []);
            const hasBookings = summary.flights + summary.accommodation + summary.activities > 0;

            return (
              <div
                key={trip.id}
                className="flex flex-col gap-3 rounded-2xl border border-brand-teal-100 bg-white p-5"
              >
                <div className="h-28 w-full overflow-hidden rounded-xl bg-brand-teal-50">
                  {trip.cover_image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={trip.cover_image_url}
                      alt={trip.destination}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-brand-teal-300">
                      <MapPin className="h-6 w-6" strokeWidth={1.5} />
                    </div>
                  )}
                </div>

                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="flex items-center gap-1 text-xs text-brand-muted">
                      <MapPin className="h-3 w-3" />
                      {trip.destination}
                    </p>
                    <h3 className="font-display text-lg font-semibold text-brand-ink">
                      {trip.title || trip.destination}
                    </h3>
                  </div>
                  <TripStatusBadge status={trip.status} />
                </div>

                {trip.description && (
                  <p className="line-clamp-2 text-sm text-brand-muted">
                    {trip.description}
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-4 text-xs text-brand-muted">
                  {dateRange && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {dateRange}
                    </span>
                  )}
                  {days && <span>{days} days</span>}
                  {trip.budget_amount != null && (
                    <span className="flex items-center gap-1">
                      <Wallet className="h-3.5 w-3.5" />
                      {formatCurrency(trip.budget_amount, currency, exchangeRate)}
                    </span>
                  )}
                </div>

                {hasBookings && (
                  <div className="flex flex-wrap items-center gap-3 text-xs text-brand-teal-700">
                    {summary.flights > 0 && (
                      <span className="flex items-center gap-1">
                        <Plane className="h-3.5 w-3.5" />
                        {summary.flights} flight{summary.flights === 1 ? "" : "s"}
                      </span>
                    )}
                    {summary.accommodation > 0 && (
                      <span className="flex items-center gap-1">
                        <Home className="h-3.5 w-3.5" />
                        {summary.accommodation} stay{summary.accommodation === 1 ? "" : "s"}
                      </span>
                    )}
                    {summary.activities > 0 && (
                      <span className="flex items-center gap-1">
                        <Ticket className="h-3.5 w-3.5" />
                        {summary.activities} activit{summary.activities === 1 ? "y" : "ies"}
                      </span>
                    )}
                  </div>
                )}

                <div className="mt-1 flex items-center justify-between">
                  <Link
                    href={`/trips/${trip.id}`}
                    className="flex items-center gap-1 text-sm font-medium text-brand-teal-700 hover:text-brand-teal-800"
                  >
                    Open trip
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                  <form action={deleteTrip.bind(null, trip.id)}>
                    <button
                      type="submit"
                      aria-label="Remove trip"
                      className="flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
                    </button>
                  </form>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
