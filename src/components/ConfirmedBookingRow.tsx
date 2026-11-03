"use client";

// A single confirmed booking on the Bookings page — shows as a compact
// row, and toggles into an inline edit form so the user can complete
// details they skipped at confirm time (cost, location, time) whenever
// they're ready, or fix anything Claude got wrong. Editing here also
// re-syncs the booking's mirrored Itinerary/Map entry.

import { useState } from "react";
import { Pencil, Trash2, X, Check, MapPin, Plane, Home, Car, Flag } from "lucide-react";
import { updateBooking, deleteBooking } from "@/app/bookings/actions";
import { formatCurrency } from "@/lib/currency-format";
import type { Currency } from "@/lib/preferences-shared";
import type { Booking, BookingType } from "@/types";

const TYPE_LABELS: Record<string, string> = {
  flight: "Flight",
  hotel: "Accommodation",
  activity: "Activity",
  car: "Transportation",
  other: "Activity",
};

const TYPE_ICON_META: Record<string, { icon: typeof Plane; badgeClass: string }> = {
  flight: { icon: Plane, badgeClass: "bg-violet-100 text-violet-700" },
  hotel: { icon: Home, badgeClass: "bg-sky-100 text-sky-700" },
  car: { icon: Car, badgeClass: "bg-amber-100 text-amber-700" },
  activity: { icon: Flag, badgeClass: "bg-brand-teal-100 text-brand-teal-700" },
  other: { icon: Flag, badgeClass: "bg-brand-teal-100 text-brand-teal-700" },
};

function toDateInputValue(iso: string): string {
  return iso.slice(0, 10);
}

// Shows a check-in – check-out range for a multi-night stay instead of
// just the start date, which used to make a 4-night hostel booking look
// like a single-day one.
function formatBookingDateLabel(booking: Booking): string {
  const startLabel = new Date(booking.start_at).toLocaleDateString("en-US", { timeZone: "UTC" });
  if (!booking.end_at) return startLabel;

  const startDateOnly = booking.start_at.slice(0, 10);
  const endDateOnly = booking.end_at.slice(0, 10);
  if (endDateOnly <= startDateOnly) return startLabel;

  const endLabel = new Date(booking.end_at).toLocaleDateString("en-US", { timeZone: "UTC" });
  return `${startLabel} – ${endLabel}`;
}

function toTimeInputValue(iso: string): string {
  if (!iso.includes("T")) return "";
  const time = iso.slice(11, 16);
  return time === "00:00" ? "" : time;
}

function normalizeBookingType(type: BookingType): BookingType {
  if (type === "flight" || type === "hotel" || type === "car") return type;
  return "activity";
}

export function ConfirmedBookingRow({
  booking,
  locationName: initialLocationName,
  currency,
  exchangeRate,
}: {
  booking: Booking;
  locationName: string;
  currency: Currency;
  exchangeRate: number;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [type, setType] = useState<BookingType>(normalizeBookingType(booking.type));
  const [title, setTitle] = useState(booking.title);
  const [confirmationNumber, setConfirmationNumber] = useState(booking.confirmation_number ?? "");
  const [startAt, setStartAt] = useState(toDateInputValue(booking.start_at));
  const [startTime, setStartTime] = useState(toTimeInputValue(booking.start_at));
  const [cost, setCost] = useState(booking.cost != null ? String(booking.cost) : "");
  const [locationName, setLocationName] = useState(initialLocationName);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const missing: string[] = [];
  if (!booking.cost) missing.push("cost");
  if (!initialLocationName) missing.push("location");
  if (!toTimeInputValue(booking.start_at)) missing.push("time");

  function cancelEdit() {
    setType(normalizeBookingType(booking.type));
    setTitle(booking.title);
    setConfirmationNumber(booking.confirmation_number ?? "");
    setStartAt(toDateInputValue(booking.start_at));
    setStartTime(toTimeInputValue(booking.start_at));
    setCost(booking.cost != null ? String(booking.cost) : "");
    setLocationName(initialLocationName);
    setError(null);
    setIsEditing(false);
  }

  async function handleSave() {
    setIsSubmitting(true);
    setError(null);

    const result = await updateBooking({
      bookingId: booking.id,
      tripId: booking.trip_id,
      type,
      title,
      confirmationNumber: confirmationNumber || undefined,
      startAt,
      startTime: startTime || undefined,
      cost: cost ? Number(cost) : undefined,
      locationName: locationName || undefined,
    });

    setIsSubmitting(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    setIsEditing(false);
  }

  function handleDelete() {
    if (!confirm(`Remove "${booking.title}" from your bookings?`)) return;
    void deleteBooking(booking.id, booking.trip_id);
  }

  if (isEditing) {
    return (
      <div className="flex flex-col gap-2 rounded-xl border border-brand-teal-200 bg-brand-teal-50/40 p-4">
        <div className="flex items-center gap-2">
          <select
            value={type}
            onChange={(event) => setType(event.target.value as BookingType)}
            className="select-input text-sm"
          >
            <option value="flight">Flight</option>
            <option value="hotel">Accommodation</option>
            <option value="car">Transportation</option>
            <option value="activity">Activity</option>
          </select>
        </div>

        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Booking title"
          className="select-input"
        />

        <div className="flex flex-col gap-1">
          <label className="flex items-center gap-1 text-xs text-brand-muted">
            <MapPin className="h-3 w-3" />
            Location (for the map)
          </label>
          <input
            value={locationName}
            onChange={(event) => setLocationName(event.target.value)}
            placeholder="e.g. Hilton Tokyo Shinjuku"
            className="select-input"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-brand-muted">Date</label>
            <input
              type="date"
              required
              value={startAt}
              onChange={(event) => setStartAt(event.target.value)}
              className="select-input"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-brand-muted">Time (optional)</label>
            <input
              type="time"
              value={startTime}
              onChange={(event) => setStartTime(event.target.value)}
              className="select-input"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-brand-muted">Confirmation #</label>
            <input
              value={confirmationNumber}
              onChange={(event) => setConfirmationNumber(event.target.value)}
              className="select-input"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-brand-muted">Cost (USD)</label>
            <input
              type="number"
              min={0}
              value={cost}
              onChange={(event) => setCost(event.target.value)}
              className="select-input"
            />
          </div>
        </div>

        {error && <p className="text-xs text-red-600">{error}</p>}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={isSubmitting}
            className="flex items-center gap-1 rounded-full bg-brand-teal-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-brand-teal-700 disabled:opacity-60"
          >
            <Check className="h-3.5 w-3.5" strokeWidth={2} />
            {isSubmitting ? "Saving..." : "Save"}
          </button>
          <button
            type="button"
            onClick={cancelEdit}
            disabled={isSubmitting}
            className="flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium text-brand-muted hover:bg-brand-teal-50"
          >
            <X className="h-3.5 w-3.5" strokeWidth={2} />
            Cancel
          </button>
        </div>
      </div>
    );
  }

  const typeMeta = TYPE_ICON_META[booking.type] ?? TYPE_ICON_META.activity;
  const TypeIcon = typeMeta.icon;

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-brand-teal-100 bg-white px-4 py-3">
      <div className="flex items-start gap-3">
        <span
          className={`mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full ${typeMeta.badgeClass}`}
          title={TYPE_LABELS[booking.type] ?? booking.type}
        >
          <TypeIcon className="h-3.5 w-3.5" strokeWidth={2} />
        </span>
        <div>
          <p className="font-medium text-brand-ink">{booking.title}</p>
          <p className="text-xs text-brand-muted">
            {TYPE_LABELS[booking.type] ?? booking.type}
            {booking.confirmation_number && ` · #${booking.confirmation_number}`}
          </p>
          {missing.length > 0 && (
            <p className="mt-0.5 text-xs text-amber-600">
              Missing {missing.join(", ")} — add now or later
            </p>
          )}
        </div>
      </div>
      <div className="flex flex-shrink-0 items-center gap-3">
        <div className="text-right text-sm text-brand-ink">
          {booking.cost != null && <p>{formatCurrency(booking.cost, currency, exchangeRate)}</p>}
          <p className="text-xs text-brand-muted">{formatBookingDateLabel(booking)}</p>
        </div>
        <button
          type="button"
          onClick={() => setIsEditing(true)}
          aria-label="Edit booking"
          className="text-brand-muted hover:text-brand-teal-700"
        >
          <Pencil className="h-4 w-4" strokeWidth={2} />
        </button>
        <button
          type="button"
          onClick={handleDelete}
          aria-label="Remove booking"
          className="text-brand-muted hover:text-red-600"
        >
          <Trash2 className="h-4 w-4" strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}
