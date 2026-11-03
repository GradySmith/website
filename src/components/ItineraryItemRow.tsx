"use client";

// A single itinerary item — shows as a compact row, and toggles into an
// inline edit form (title, day, time, location, type) on demand. Used by
// ItineraryDayList for every item under every day.

import { useState } from "react";
import { Clock, MapPin, Trash2, Pencil, X, Check } from "lucide-react";
import { deleteItineraryItem, updateItineraryItem } from "@/app/trips/actions";
import { ITEM_TYPE_META } from "@/lib/itinerary-type-meta";
import type { ItineraryItem, ItineraryItemType } from "@/types";

export function ItineraryItemRow({
  tripId,
  item,
  availableDays,
  currentDayNumber,
}: {
  tripId: string;
  item: ItineraryItem;
  availableDays: { dayNumber: number; label: string }[];
  // Which day's card this row is being rendered under — only meaningful
  // for a multi-day item (a stay spanning several nights shows the same
  // row under each of those days), so it can say "Night 2 of 4" instead
  // of looking like the same booking got duplicated.
  currentDayNumber?: number;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(item.title);
  const [dayNumber, setDayNumber] = useState(item.day_number);
  const [endDayNumber, setEndDayNumber] = useState(item.end_day_number ?? item.day_number);
  const [locationName, setLocationName] = useState(item.location_name ?? "");
  const [startTime, setStartTime] = useState(item.start_time ?? "");
  const [itemType, setItemType] = useState<ItineraryItemType>(item.item_type);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // end_day_number is the CHECKOUT day, not the last night stayed — a
  // booking Aug 27 - Aug 29 is 2 nights (27, 28), not 3, since the guest
  // leaves on the 29th rather than sleeping there that night.
  const spansMultipleDays = item.end_day_number != null && item.end_day_number > item.day_number;
  const nightsTotal = spansMultipleDays ? (item.end_day_number as number) - item.day_number : 1;
  const nightIndex =
    spansMultipleDays && currentDayNumber != null ? currentDayNumber - item.day_number + 1 : 1;

  function cancelEdit() {
    setTitle(item.title);
    setDayNumber(item.day_number);
    setEndDayNumber(item.end_day_number ?? item.day_number);
    setLocationName(item.location_name ?? "");
    setStartTime(item.start_time ?? "");
    setItemType(item.item_type);
    setError(null);
    setIsEditing(false);
  }

  async function handleSave() {
    setIsSubmitting(true);
    setError(null);

    const result = await updateItineraryItem({
      tripId,
      itemId: item.id,
      title,
      dayNumber,
      endDayNumber: endDayNumber > dayNumber ? endDayNumber : undefined,
      locationName: locationName || undefined,
      startTime: startTime || undefined,
      itemType,
    });

    setIsSubmitting(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    setIsEditing(false);
  }

  if (isEditing) {
    return (
      <div className="flex flex-col gap-2 rounded-xl border border-brand-teal-200 bg-brand-teal-50/40 p-4">
        <div className="flex w-fit overflow-hidden rounded-full border border-brand-teal-200 bg-white">
          {(Object.keys(ITEM_TYPE_META) as ItineraryItemType[]).map((type) => {
            const meta = ITEM_TYPE_META[type];
            const Icon = meta.icon;
            return (
              <button
                key={type}
                type="button"
                onClick={() => setItemType(type)}
                aria-pressed={itemType === type}
                className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium transition-colors ${
                  itemType === type
                    ? "bg-brand-teal-600 text-white"
                    : "text-brand-muted hover:bg-brand-teal-50"
                }`}
              >
                <Icon className="h-3 w-3" strokeWidth={2} />
                {meta.label}
              </button>
            );
          })}
        </div>

        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Title"
          className="select-input"
        />

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <div className="flex flex-col gap-1">
            {itemType === "accommodation" && (
              <label className="text-xs text-brand-muted">Check in</label>
            )}
            <select
              value={dayNumber}
              onChange={(event) => {
                const nextDay = Number(event.target.value);
                setDayNumber(nextDay);
                if (endDayNumber < nextDay) setEndDayNumber(nextDay);
              }}
              className="select-input"
            >
              {availableDays.map((day) => (
                <option key={day.dayNumber} value={day.dayNumber}>
                  {day.label}
                </option>
              ))}
            </select>
          </div>
          <input
            type="time"
            value={startTime}
            onChange={(event) => setStartTime(event.target.value)}
            className="select-input"
          />
          <input
            value={locationName}
            onChange={(event) => setLocationName(event.target.value)}
            placeholder="Location (for the map)"
            className="select-input"
          />
        </div>

        {itemType === "accommodation" && (
          <div className="flex flex-col gap-1 sm:w-1/3">
            <label className="text-xs text-brand-muted">Check out</label>
            <select
              value={endDayNumber}
              onChange={(event) => setEndDayNumber(Number(event.target.value))}
              className="select-input"
            >
              {availableDays
                .filter((day) => day.dayNumber >= dayNumber)
                .map((day) => (
                  <option key={day.dayNumber} value={day.dayNumber}>
                    {day.label}
                  </option>
                ))}
            </select>
          </div>
        )}

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

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-brand-teal-100 bg-white px-4 py-3">
      <div className="flex items-start gap-3">
        {(() => {
          const meta = ITEM_TYPE_META[item.item_type];
          const Icon = meta.icon;
          return (
            <span
              className={`mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full ${meta.badgeClass}`}
              title={meta.label}
            >
              <Icon className="h-3.5 w-3.5" strokeWidth={2} />
            </span>
          );
        })()}
        <div>
          <p className="font-medium text-brand-ink">{item.title}</p>
          <div className="mt-0.5 flex flex-wrap items-center gap-3 text-xs text-brand-muted">
            {spansMultipleDays && (
              <span className="rounded-full bg-sky-50 px-2 py-0.5 font-medium text-sky-700">
                Night {nightIndex} of {nightsTotal}
              </span>
            )}
            {item.start_time && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {item.start_time}
              </span>
            )}
            {item.location_name && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {item.location_name}
                {item.latitude == null && " (not found on map)"}
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="flex flex-shrink-0 items-center gap-3">
        <button
          type="button"
          onClick={() => setIsEditing(true)}
          aria-label="Edit item"
          className="text-brand-muted hover:text-brand-teal-700"
        >
          <Pencil className="h-4 w-4" strokeWidth={2} />
        </button>
        <form action={deleteItineraryItem.bind(null, tripId, item.id)}>
          <button
            type="submit"
            aria-label="Remove item"
            className="text-brand-muted hover:text-red-600"
          >
            <Trash2 className="h-4 w-4" strokeWidth={2} />
          </button>
        </form>
      </div>
    </div>
  );
}
