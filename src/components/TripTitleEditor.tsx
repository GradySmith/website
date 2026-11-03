"use client";

// Trip title/destination heading on the trip layout header, with a pencil
// icon that toggles into an inline rename form.

import { useState, useTransition } from "react";
import { Pencil, X, Check } from "lucide-react";
import { updateTripTitle } from "@/app/trips/actions";
import { TripStatusBadge } from "./TripStatusBadge";
import type { TripStatus } from "@/types";

export function TripTitleEditor({
  tripId,
  title,
  destination,
  status,
}: {
  tripId: string;
  title: string | null;
  destination: string;
  status: TripStatus;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(title || destination);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function cancel() {
    setValue(title || destination);
    setError(null);
    setIsEditing(false);
  }

  function save() {
    setError(null);
    startTransition(async () => {
      const result = await updateTripTitle({ tripId, title: value });
      if (result.success) {
        setIsEditing(false);
      } else {
        setError(result.error);
      }
    });
  }

  if (isEditing) {
    return (
      <div className="flex flex-1 flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <input
            value={value}
            onChange={(event) => setValue(event.target.value)}
            autoFocus
            className="select-input font-display text-xl font-semibold"
          />
          <button
            type="button"
            onClick={save}
            disabled={isPending}
            aria-label="Save title"
            className="flex-shrink-0 rounded-full bg-brand-teal-600 p-1.5 text-white transition-colors hover:bg-brand-teal-700 disabled:opacity-60"
          >
            <Check className="h-4 w-4" strokeWidth={2} />
          </button>
          <button
            type="button"
            onClick={cancel}
            disabled={isPending}
            aria-label="Cancel"
            className="flex-shrink-0 rounded-full p-1.5 text-brand-muted hover:bg-brand-teal-50"
          >
            <X className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <h1 className="font-display text-3xl font-semibold text-brand-ink">
        {title || destination}
      </h1>
      <TripStatusBadge status={status} />
      <button
        type="button"
        onClick={() => setIsEditing(true)}
        aria-label="Rename trip"
        className="text-brand-muted hover:text-brand-teal-700"
      >
        <Pencil className="h-4 w-4" strokeWidth={2} />
      </button>
    </div>
  );
}
