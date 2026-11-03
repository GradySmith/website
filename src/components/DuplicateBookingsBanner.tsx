"use client";

// Shown above the bookings list (globally on /bookings, and scoped to one
// trip on the itinerary page) whenever two confirmed bookings look like
// they might be the same real-world booking entered twice — e.g. a combined
// itinerary email plus the individual airline confirmation for the same
// flight. Purely a suggestion: the user picks which one (if either) to
// remove, or dismisses the notice.

import { useState, useTransition } from "react";
import { AlertTriangle, Trash2, X } from "lucide-react";
import { deleteBooking } from "@/app/bookings/actions";
import type { Booking } from "@/types";

type BookingLike = Booking & { trip?: { title: string | null; destination: string } | null };

// timeZone: "UTC" is required, not cosmetic — without it, this formats in
// whatever timezone the runtime happens to be in, which differs between
// SSR (Node server) and hydration (the browser) and can both show the
// wrong calendar date and trigger a React hydration mismatch.
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function BookingChoice({ booking, onRemoved }: { booking: BookingLike; onRemoved: () => void }) {
  const [isPending, startTransition] = useTransition();
  const [isRemoved, setIsRemoved] = useState(false);

  function handleDelete() {
    startTransition(async () => {
      await deleteBooking(booking.id, booking.trip_id);
      setIsRemoved(true);
      onRemoved();
    });
  }

  if (isRemoved) {
    return <p className="text-xs font-medium text-emerald-700">Removed.</p>;
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-white px-3 py-2">
      <div>
        <p className="text-sm font-medium text-brand-ink">{booking.title}</p>
        <p className="text-xs text-brand-muted">
          {formatDate(booking.start_at)}
          {booking.trip && ` · ${booking.trip.title || booking.trip.destination}`}
        </p>
      </div>
      <button
        type="button"
        onClick={handleDelete}
        disabled={isPending}
        className="flex flex-shrink-0 items-center gap-1 rounded-full border border-amber-300 px-2.5 py-1 text-xs font-medium text-amber-800 transition-colors hover:bg-amber-100 disabled:opacity-60"
      >
        <Trash2 className="h-3 w-3" strokeWidth={2} />
        {isPending ? "Removing..." : "Remove this one"}
      </button>
    </div>
  );
}

export function DuplicateBookingsBanner({ pairs }: { pairs: { a: BookingLike; b: BookingLike }[] }) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [resolved, setResolved] = useState<Set<string>>(new Set());

  const visible = pairs.filter((pair) => {
    const key = pair.a.id < pair.b.id ? `${pair.a.id}-${pair.b.id}` : `${pair.b.id}-${pair.a.id}`;
    return !dismissed.has(key) && !resolved.has(key);
  });

  if (visible.length === 0) return null;

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600" strokeWidth={2} />
        <p className="text-sm font-medium text-amber-900">
          These bookings look like they might be duplicates — same trip, same day, similar titles.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {visible.map((pair) => {
          const key = pair.a.id < pair.b.id ? `${pair.a.id}-${pair.b.id}` : `${pair.b.id}-${pair.a.id}`;
          return (
            <div key={key} className="flex flex-col gap-2 rounded-lg bg-amber-100/60 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-medium text-amber-800">Possible duplicate</p>
                <button
                  type="button"
                  onClick={() => setDismissed((prev) => new Set(prev).add(key))}
                  aria-label="Dismiss"
                  className="text-amber-700 hover:text-amber-900"
                >
                  <X className="h-3.5 w-3.5" strokeWidth={2} />
                </button>
              </div>
              <BookingChoice
                booking={pair.a}
                onRemoved={() => setResolved((prev) => new Set(prev).add(key))}
              />
              <BookingChoice
                booking={pair.b}
                onRemoved={() => setResolved((prev) => new Set(prev).add(key))}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
