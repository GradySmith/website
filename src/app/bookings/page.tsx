import Link from "next/link";
import { Ticket, Trash2 } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { GmailSyncPanel } from "@/components/GmailSyncPanel";
import { ScreenshotUploadPanel } from "@/components/ScreenshotUploadPanel";
import { DetectedBookingCard } from "@/components/DetectedBookingCard";
import { ConfirmedBookingRow } from "@/components/ConfirmedBookingRow";
import { DuplicateBookingsBanner } from "@/components/DuplicateBookingsBanner";
import { createClient } from "@/lib/supabase-server";
import { getServerPreferences } from "@/lib/preferences";
import { getUsdToCadRate } from "@/lib/exchange-rate";
import { findPossibleDuplicateBookings } from "@/lib/duplicate-bookings";
import { t } from "@/lib/i18n";
import type { Booking, DetectedBooking, EmailConnection, Trip } from "@/types";

type BookingWithTrip = Booking & {
  trip: { title: string | null; destination: string } | null;
};

export default async function BookingsPage() {
  const supabase = await createClient();

  const [
    { data: connection },
    { data: detected },
    { data: trips },
    { data: bookings },
    { locale, currency },
    exchangeRate,
  ] = await Promise.all([
    supabase
      .from("email_connections")
      .select("*")
      .eq("provider", "google")
      .maybeSingle(),
    supabase
      .from("detected_bookings")
      .select("*")
      .eq("status", "pending")
      .order("start_at", { ascending: true, nullsFirst: false }),
    supabase
      .from("trips")
      .select("id, title, destination")
      .order("created_at", { ascending: false }),
    supabase
      .from("bookings")
      .select("*, trip:trips(title, destination)")
      .is("deleted_at", null)
      .order("start_at", { ascending: true }),
    getServerPreferences(),
    getUsdToCadRate(),
  ]);

  const typedConnection = connection as EmailConnection | null;
  const detectedBookings = (detected as DetectedBooking[]) ?? [];
  const tripOptions = (trips as Pick<Trip, "id" | "title" | "destination">[]) ?? [];
  const confirmedBookings = (bookings as BookingWithTrip[]) ?? [];

  // The `bookings` table itself has no location column — that only lives
  // on the mirrored itinerary_items row (migration 0007's
  // source_booking_id) — so pull those in to pre-fill each booking's edit
  // form with its current map location.
  const bookingIds = confirmedBookings.map((booking) => booking.id);
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

  const bookingsByTrip = new Map<string, BookingWithTrip[]>();
  for (const booking of confirmedBookings) {
    const label = booking.trip?.title || booking.trip?.destination || "Unassigned";
    const list = bookingsByTrip.get(label) ?? [];
    list.push(booking);
    bookingsByTrip.set(label, list);
  }

  const duplicatePairs = findPossibleDuplicateBookings(confirmedBookings);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold text-brand-ink">
            {t(locale, "bookings_heading")}
          </h1>
          <p className="mt-1 text-sm text-brand-muted">{t(locale, "bookings_subheading")}</p>
        </div>
        <Link
          href="/trash"
          className="flex flex-shrink-0 items-center gap-1.5 rounded-full border border-brand-teal-100 px-3 py-1.5 text-xs font-medium text-brand-muted transition-colors hover:border-brand-teal-300 hover:text-brand-teal-700"
        >
          <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
          Trash
        </Link>
      </div>

      <GmailSyncPanel
        connected={Boolean(typedConnection)}
        lastScannedAt={typedConnection?.last_scanned_at ?? null}
      />

      <ScreenshotUploadPanel />

      {duplicatePairs.length > 0 && <DuplicateBookingsBanner pairs={duplicatePairs} />}

      {detectedBookings.length > 0 && (
        <div className="flex flex-col gap-3">
          <h2 className="font-display text-lg font-semibold text-brand-ink">
            Detected bookings ({detectedBookings.length})
          </h2>
          <p className="text-sm text-brand-muted">
            From your inbox or an uploaded screenshot. Review each one, fix anything that
            looks off, then confirm to add it to a trip — or dismiss it if it&apos;s not a
            real booking.
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {detectedBookings.map((booking) => (
              <DetectedBookingCard key={booking.id} booking={booking} trips={tripOptions} />
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3">
        <h2 className="font-display text-lg font-semibold text-brand-ink">Your bookings</h2>
        {bookingsByTrip.size === 0 ? (
          <EmptyState
            icon={Ticket}
            title="No bookings yet"
            description="Connect Gmail or scan a screenshot above, and confirmations you approve will show up here grouped by trip."
          />
        ) : (
          <div className="flex flex-col gap-6">
            {[...bookingsByTrip.entries()].map(([tripLabel, items]) => (
              <div key={tripLabel} className="flex flex-col gap-2">
                <h3 className="text-sm font-semibold text-brand-teal-700">{tripLabel}</h3>
                <div className="flex flex-col gap-2">
                  {items.map((booking) => (
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
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
