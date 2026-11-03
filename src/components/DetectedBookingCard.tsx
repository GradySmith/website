"use client";

import { useState, useTransition } from "react";
import { Plane, Hotel, Car, Ticket, MapPin, Check, X } from "lucide-react";
import { PillButton } from "./PillButton";
import { confirmDetectedBooking, dismissDetectedBooking } from "@/app/bookings/actions";
import type { BookingType, DetectedBooking } from "@/types";

const TYPE_ICONS: Record<BookingType, typeof Plane> = {
  flight: Plane,
  hotel: Hotel,
  car: Car,
  activity: Ticket,
  other: Ticket,
};

function toDateInputValue(iso: string | null): string {
  if (!iso) return "";
  return iso.slice(0, 10);
}

// Claude sometimes extracts a full datetime (e.g. a flight's departure
// time), sometimes just a date — this pulls a time out for the <input
// type="time"> field only when there's a real, non-midnight time to show,
// so a date-only extraction doesn't get a misleading "12:00 AM" default.
function toTimeInputValue(iso: string | null): string {
  if (!iso || !iso.includes("T")) return "";
  const time = iso.slice(11, 16);
  return time === "00:00" ? "" : time;
}

// Confirming a booking offers 4 categories (Flight / Accommodation /
// Transportation / Activity) — Claude's email extraction can still tag
// something "other", so that folds into Activity here rather than leaving
// the select showing nothing selected.
function normalizeBookingType(type: BookingType): BookingType {
  if (type === "flight" || type === "hotel" || type === "car") return type;
  return "activity";
}

export function DetectedBookingCard({
  booking,
  trips,
}: {
  booking: DetectedBooking;
  trips: { id: string; title: string | null; destination: string }[];
}) {
  const [isPending, startTransition] = useTransition();
  const [isResolved, setIsResolved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [type, setType] = useState<BookingType>(normalizeBookingType(booking.type));
  const [title, setTitle] = useState(booking.title);
  const [confirmationNumber, setConfirmationNumber] = useState(
    booking.confirmation_number ?? ""
  );
  const [startAt, setStartAt] = useState(toDateInputValue(booking.start_at));
  const [startTime, setStartTime] = useState(toTimeInputValue(booking.start_at));
  const [endAt, setEndAt] = useState(toDateInputValue(booking.end_at));
  const [cost, setCost] = useState(booking.cost != null ? String(booking.cost) : "");
  const [locationName, setLocationName] = useState(booking.destination_guess ?? "");
  const [tripChoice, setTripChoice] = useState(trips.length > 0 ? trips[0].id : "__new__");
  const [newTripDestination, setNewTripDestination] = useState(
    booking.destination_guess ?? ""
  );

  const Icon = TYPE_ICONS[type];
  const isFromScreenshot = booking.source_message_id.startsWith("screenshot-");

  const missing: string[] = [];
  if (!cost) missing.push("cost");
  if (!locationName) missing.push("location");
  if (!startTime) missing.push("time");

  function handleConfirm() {
    setError(null);

    if (!startAt) {
      setError("Start / check-in date is required.");
      return;
    }

    startTransition(async () => {
      const result = await confirmDetectedBooking({
        detectedId: booking.id,
        tripId: tripChoice === "__new__" ? undefined : tripChoice,
        newTripDestination: tripChoice === "__new__" ? newTripDestination : undefined,
        type,
        title,
        confirmationNumber: confirmationNumber || undefined,
        startAt,
        startTime: startTime || undefined,
        endAt: endAt || undefined,
        cost: cost ? Number(cost) : undefined,
        locationName: locationName || undefined,
      });

      if (result.success) {
        setIsResolved(true);
      } else {
        setError(result.error);
      }
    });
  }

  function handleDismiss() {
    startTransition(async () => {
      const result = await dismissDetectedBooking(booking.id);
      if (result.success) setIsResolved(true);
    });
  }

  if (isResolved) return null;

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-brand-teal-100 bg-white p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-brand-teal-600" />
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
        {isFromScreenshot && (
          <span className="flex-shrink-0 rounded-full bg-brand-teal-50 px-2.5 py-0.5 text-xs font-medium text-brand-teal-700">
            From screenshot
          </span>
        )}
      </div>

      <input
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        className="select-input"
        placeholder="Booking title"
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
          <label className="text-xs text-brand-muted">Start / check-in *</label>
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
          <label className="text-xs text-brand-muted">End / check-out</label>
          <input
            type="date"
            value={endAt}
            onChange={(event) => setEndAt(event.target.value)}
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

      <div className="flex flex-col gap-1">
        <label className="text-xs text-brand-muted">Add to trip</label>
        <select
          value={tripChoice}
          onChange={(event) => setTripChoice(event.target.value)}
          className="select-input"
        >
          {trips.map((trip) => (
            <option key={trip.id} value={trip.id}>
              {trip.title || trip.destination}
            </option>
          ))}
          <option value="__new__">+ Create new trip...</option>
        </select>
        {tripChoice === "__new__" && (
          <input
            value={newTripDestination}
            onChange={(event) => setNewTripDestination(event.target.value)}
            placeholder="Destination for the new trip"
            className="select-input mt-1"
          />
        )}
      </div>

      {missing.length > 0 && !error && (
        <p className="text-xs text-amber-600">
          Missing {missing.join(", ")} — fill it in now, or confirm and add it later from
          Bookings.
        </p>
      )}

      {error && <p className="text-xs text-red-600">{error}</p>}

      <div className="flex gap-2">
        <PillButton
          type="button"
          variant="primary"
          onClick={handleConfirm}
          disabled={isPending}
          className="flex-1 justify-center"
        >
          <Check className="h-4 w-4" />
          {isPending ? "Saving..." : "Confirm & add"}
        </PillButton>
        <PillButton
          type="button"
          variant="secondary"
          onClick={handleDismiss}
          disabled={isPending}
          className="justify-center"
        >
          <X className="h-4 w-4" />
          Dismiss
        </PillButton>
      </div>
    </div>
  );
}
