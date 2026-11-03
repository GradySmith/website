import Link from "next/link";
import { Trash2, MapPin, Clock } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { RestoreButton } from "@/components/RestoreButton";
import { ITEM_TYPE_META } from "@/lib/itinerary-type-meta";
import { createClient } from "@/lib/supabase-server";
import type { Booking, ItineraryItem, Trip } from "@/types";

const BOOKING_TYPE_LABELS: Record<string, string> = {
  flight: "Flight",
  hotel: "Accommodation",
  activity: "Activity",
  car: "Transportation",
  other: "Activity",
};

function formatDeletedAt(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
  });
}

export default async function TrashPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub as string | undefined;

  const { data: trips } = await supabase
    .from("trips")
    .select("id, title, destination")
    .eq("user_id", userId ?? "");

  const tripOptions = (trips as Pick<Trip, "id" | "title" | "destination">[]) ?? [];
  const tripIds = tripOptions.map((trip) => trip.id);
  const tripLabelById: Record<string, string> = {};
  for (const trip of tripOptions) {
    tripLabelById[trip.id] = trip.title || trip.destination;
  }

  const [{ data: deletedItems }, { data: deletedBookings }] = tripIds.length
    ? await Promise.all([
        supabase
          .from("itinerary_items")
          .select("*")
          .in("trip_id", tripIds)
          .not("deleted_at", "is", null)
          .order("deleted_at", { ascending: false }),
        supabase
          .from("bookings")
          .select("*")
          .in("trip_id", tripIds)
          .not("deleted_at", "is", null)
          .order("deleted_at", { ascending: false }),
      ])
    : [{ data: [] }, { data: [] }];

  const itineraryTrash = (deletedItems as ItineraryItem[]) ?? [];
  const bookingTrash = (deletedBookings as Booking[]) ?? [];
  const isEmpty = itineraryTrash.length === 0 && bookingTrash.length === 0;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8">
      <div>
        <h1 className="flex items-center gap-2 font-display text-3xl font-semibold text-brand-ink">
          <Trash2 className="h-6 w-6 text-brand-teal-600" />
          Trash
        </h1>
        <p className="mt-1 text-sm text-brand-muted">
          Deleted activities, flights, and bookings stay here so you can bring them back.
        </p>
      </div>

      {isEmpty ? (
        <EmptyState
          icon={Trash2}
          title="Trash is empty"
          description="Anything you delete from a trip's itinerary or your bookings shows up here so you can undo it."
        />
      ) : (
        <>
          {bookingTrash.length > 0 && (
            <div className="flex flex-col gap-3">
              <h2 className="font-display text-lg font-semibold text-brand-ink">
                Deleted bookings ({bookingTrash.length})
              </h2>
              <div className="flex flex-col gap-2">
                {bookingTrash.map((booking) => (
                  <div
                    key={booking.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-brand-teal-100 bg-white px-4 py-3"
                  >
                    <div>
                      <p className="font-medium text-brand-ink">{booking.title}</p>
                      <div className="mt-0.5 flex flex-wrap items-center gap-3 text-xs text-brand-muted">
                        <span>{BOOKING_TYPE_LABELS[booking.type] ?? booking.type}</span>
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {tripLabelById[booking.trip_id] ?? "Unknown trip"}
                        </span>
                        {booking.deleted_at && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Deleted {formatDeletedAt(booking.deleted_at)}
                          </span>
                        )}
                      </div>
                    </div>
                    <RestoreButton kind="booking" id={booking.id} tripId={booking.trip_id} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {itineraryTrash.length > 0 && (
            <div className="flex flex-col gap-3">
              <h2 className="font-display text-lg font-semibold text-brand-ink">
                Deleted itinerary items ({itineraryTrash.length})
              </h2>
              <div className="flex flex-col gap-2">
                {itineraryTrash.map((item) => {
                  const meta = ITEM_TYPE_META[item.item_type];
                  const Icon = meta.icon;
                  return (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-brand-teal-100 bg-white px-4 py-3"
                    >
                      <div className="flex items-start gap-3">
                        <span
                          className={`mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full ${meta.badgeClass}`}
                        >
                          <Icon className="h-3.5 w-3.5" strokeWidth={2} />
                        </span>
                        <div>
                          <p className="font-medium text-brand-ink">{item.title}</p>
                          <div className="mt-0.5 flex flex-wrap items-center gap-3 text-xs text-brand-muted">
                            <span>Day {item.day_number}</span>
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {tripLabelById[item.trip_id] ?? "Unknown trip"}
                            </span>
                            {item.deleted_at && (
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                Deleted {formatDeletedAt(item.deleted_at)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <RestoreButton kind="itinerary" id={item.id} tripId={item.trip_id} />
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      <Link
        href="/bookings"
        className="self-start text-sm font-medium text-brand-teal-700 hover:text-brand-teal-800"
      >
        ← Back to Bookings
      </Link>
    </div>
  );
}
