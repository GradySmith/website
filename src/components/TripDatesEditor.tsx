"use client";

// Displays a trip's date range on the Overview tab, with a pencil icon
// that toggles into an inline start/end date editor.

import { useState, useTransition } from "react";
import { Calendar, Pencil, X, Check } from "lucide-react";
import { updateTripDates } from "@/app/trips/actions";
import { parseDateOnly } from "@/lib/date-only";

function formatDateRange(startDate: string | null, endDate: string | null): string | null {
  if (!startDate || !endDate) return null;
  const opts: Intl.DateTimeFormatOptions = { month: "long", day: "numeric", year: "numeric" };
  const start = parseDateOnly(startDate).toLocaleDateString("en-US", opts);
  const end = parseDateOnly(endDate).toLocaleDateString("en-US", opts);
  return `${start} – ${end}`;
}

function tripDurationDays(startDate: string | null, endDate: string | null): number | null {
  if (!startDate || !endDate) return null;
  const diffMs = parseDateOnly(endDate).getTime() - parseDateOnly(startDate).getTime();
  return Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1);
}

export function TripDatesEditor({
  tripId,
  startDate,
  endDate,
}: {
  tripId: string;
  startDate: string | null;
  endDate: string | null;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [start, setStart] = useState(startDate ?? "");
  const [end, setEnd] = useState(endDate ?? "");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function cancel() {
    setStart(startDate ?? "");
    setEnd(endDate ?? "");
    setError(null);
    setIsEditing(false);
  }

  function save() {
    setError(null);
    startTransition(async () => {
      const result = await updateTripDates({
        tripId,
        startDate: start || null,
        endDate: end || null,
      });
      if (result.success) {
        setIsEditing(false);
      } else {
        setError(result.error);
      }
    });
  }

  if (isEditing) {
    return (
      <div className="flex flex-1 flex-col gap-2">
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-brand-muted">Start date</label>
            <input
              type="date"
              value={start}
              onChange={(event) => setStart(event.target.value)}
              className="select-input"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-brand-muted">End date</label>
            <input
              type="date"
              value={end}
              onChange={(event) => setEnd(event.target.value)}
              className="select-input"
            />
          </div>
        </div>

        {error && <p className="text-xs text-red-600">{error}</p>}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={save}
            disabled={isPending}
            className="flex items-center gap-1 rounded-full bg-brand-teal-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-brand-teal-700 disabled:opacity-60"
          >
            <Check className="h-3.5 w-3.5" strokeWidth={2} />
            {isPending ? "Saving..." : "Save"}
          </button>
          <button
            type="button"
            onClick={cancel}
            disabled={isPending}
            className="flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium text-brand-muted hover:bg-brand-teal-50"
          >
            <X className="h-3.5 w-3.5" strokeWidth={2} />
            Cancel
          </button>
        </div>
      </div>
    );
  }

  const dateRange = formatDateRange(startDate, endDate);
  const durationDays = tripDurationDays(startDate, endDate);

  return (
    <div className="flex items-start gap-2 text-sm">
      <Calendar className="mt-0.5 h-4 w-4 flex-shrink-0 text-brand-teal-600" />
      <div className="flex-1">
        {dateRange ? (
          <>
            <p className="text-brand-ink">{dateRange}</p>
            {durationDays && <p className="text-xs text-brand-muted">{durationDays} days</p>}
          </>
        ) : (
          <p className="text-brand-muted">No dates set yet</p>
        )}
      </div>
      <button
        type="button"
        onClick={() => setIsEditing(true)}
        aria-label="Edit dates"
        className="flex-shrink-0 text-brand-muted hover:text-brand-teal-700"
      >
        <Pencil className="h-3.5 w-3.5" strokeWidth={2} />
      </button>
    </div>
  );
}
