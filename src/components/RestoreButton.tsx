"use client";

import { useState, useTransition } from "react";
import { RotateCcw } from "lucide-react";
import { restoreItineraryItem } from "@/app/trips/actions";
import { restoreBooking } from "@/app/bookings/actions";

export function RestoreButton({
  kind,
  id,
  tripId,
}: {
  kind: "itinerary" | "booking";
  id: string;
  tripId: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [isRestored, setIsRestored] = useState(false);

  function handleRestore() {
    setError(null);
    startTransition(async () => {
      const result =
        kind === "itinerary"
          ? await restoreItineraryItem(tripId, id)
          : await restoreBooking(id, tripId);

      if (result.success) {
        setIsRestored(true);
      } else {
        setError(result.error);
      }
    });
  }

  if (isRestored) {
    return <span className="text-xs font-medium text-emerald-600">Restored</span>;
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleRestore}
        disabled={isPending}
        className="flex items-center gap-1.5 rounded-full border border-brand-teal-200 px-3 py-1.5 text-xs font-medium text-brand-teal-700 transition-colors hover:bg-brand-teal-50 disabled:opacity-60"
      >
        <RotateCcw className="h-3.5 w-3.5" strokeWidth={2} />
        {isPending ? "Restoring..." : "Restore"}
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
