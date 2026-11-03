"use client";

import { useState, type FormEvent } from "react";
import { Plus, Flag, Home } from "lucide-react";
import { PillButton } from "./PillButton";
import { addItineraryItem } from "@/app/trips/actions";
import type { ItineraryItemType } from "@/types";

export function AddItineraryItemForm({
  tripId,
  defaultDay,
}: {
  tripId: string;
  defaultDay: number;
}) {
  const [dayNumber, setDayNumber] = useState(defaultDay);
  const [title, setTitle] = useState("");
  const [locationName, setLocationName] = useState("");
  const [startTime, setStartTime] = useState("");
  const [itemType, setItemType] = useState<ItineraryItemType>("activity");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

    setTitle("");
    setLocationName("");
    setStartTime("");
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded-2xl border border-dashed border-brand-teal-200 bg-brand-teal-50/40 p-4"
    >
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold uppercase tracking-wide text-brand-muted">
          Type
        </label>
        <div className="flex w-fit overflow-hidden rounded-full border border-brand-teal-200 bg-white">
          <button
            type="button"
            onClick={() => setItemType("activity")}
            aria-pressed={itemType === "activity"}
            className={`flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium transition-colors ${
              itemType === "activity"
                ? "bg-brand-teal-600 text-white"
                : "text-brand-muted hover:bg-brand-teal-50"
            }`}
          >
            <Flag className="h-3.5 w-3.5" strokeWidth={2} />
            Activity
          </button>
          <button
            type="button"
            onClick={() => setItemType("accommodation")}
            aria-pressed={itemType === "accommodation"}
            className={`flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium transition-colors ${
              itemType === "accommodation"
                ? "bg-brand-teal-600 text-white"
                : "text-brand-muted hover:bg-brand-teal-50"
            }`}
          >
            <Home className="h-3.5 w-3.5" strokeWidth={2} />
            Accommodation
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold uppercase tracking-wide text-brand-muted">
            Day
          </label>
          <input
            type="number"
            min={1}
            value={dayNumber}
            onChange={(event) => setDayNumber(Number(event.target.value))}
            className="select-input"
          />
        </div>
        <div className="col-span-2 flex flex-col gap-1.5 sm:col-span-1">
          <label className="text-xs font-semibold uppercase tracking-wide text-brand-muted">
            Time
          </label>
          <input
            value={startTime}
            onChange={(event) => setStartTime(event.target.value)}
            placeholder="9:00 AM"
            className="select-input"
          />
        </div>
        <div className="col-span-2 flex flex-col gap-1.5 sm:col-span-2">
          <label className="text-xs font-semibold uppercase tracking-wide text-brand-muted">
            {itemType === "accommodation" ? "Accommodation" : "Activity"}
          </label>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder={
              itemType === "accommodation" ? "e.g. Gracery Shinjuku" : "e.g. Fushimi Inari-taisha"
            }
            required
            className="select-input"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold uppercase tracking-wide text-brand-muted">
          Location (for the map)
        </label>
        <input
          value={locationName}
          onChange={(event) => setLocationName(event.target.value)}
          placeholder="e.g. Fushimi Inari Taisha, Kyoto, Japan"
          className="select-input"
        />
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      <PillButton type="submit" disabled={isSubmitting} className="self-start">
        <Plus className="h-4 w-4" />
        {isSubmitting ? "Adding..." : `Add ${itemType === "accommodation" ? "accommodation" : "activity"}`}
      </PillButton>
    </form>
  );
}
