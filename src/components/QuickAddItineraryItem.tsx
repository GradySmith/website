"use client";

// Inline per-day, per-type quick-add control used by ItineraryDayList. The
// day number and item type are both fixed by the props (not user-entered),
// so this is just title + optional time + optional location.

import { useState, type FormEvent } from "react";
import { Plus, Flag, Home } from "lucide-react";
import { addItineraryItem } from "@/app/trips/actions";
import type { ItineraryItemType } from "@/types";

export function QuickAddItineraryItem({
  tripId,
  dayNumber,
  itemType,
}: {
  tripId: string;
  dayNumber: number;
  itemType: ItineraryItemType;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [locationName, setLocationName] = useState("");
  const [startTime, setStartTime] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const Icon = itemType === "accommodation" ? Home : Flag;
  const label = itemType === "accommodation" ? "accommodation" : "activity";

  function reset() {
    setTitle("");
    setLocationName("");
    setStartTime("");
    setError(null);
    setIsOpen(false);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const result = await addItineraryItem({
      tripId,
      dayNumber,
      title,
      locationName: locationName || undefined,
      startTime: startTime || undefined,
      itemType,
    });

    setIsSubmitting(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    reset();
  }

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={`flex items-center gap-1.5 rounded-full border border-dashed px-3 py-1.5 text-xs font-medium transition-colors ${
          itemType === "accommodation"
            ? "border-sky-200 text-sky-700 hover:bg-sky-50"
            : "border-brand-teal-200 text-brand-teal-700 hover:bg-brand-teal-50"
        }`}
      >
        <Plus className="h-3.5 w-3.5" strokeWidth={2} />
        <Icon className="h-3.5 w-3.5" strokeWidth={2} />
        Add {label}
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-2 rounded-xl border border-dashed border-brand-teal-200 bg-brand-teal-50/40 p-3"
    >
      <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-brand-muted">
        <Icon className="h-3.5 w-3.5" strokeWidth={2} />
        New {label}
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder={itemType === "accommodation" ? "e.g. Gracery Shinjuku" : "e.g. Fushimi Inari-taisha"}
          required
          autoFocus
          className="select-input sm:col-span-1"
        />
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

      {error && <p className="text-xs text-red-600">{error}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-full bg-brand-teal-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-brand-teal-700 disabled:opacity-60"
        >
          {isSubmitting ? "Adding..." : "Save"}
        </button>
        <button
          type="button"
          onClick={reset}
          className="rounded-full px-3 py-1.5 text-xs font-medium text-brand-muted hover:bg-brand-teal-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
