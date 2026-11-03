"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import { PillButton } from "./PillButton";
import { createTrip } from "@/app/trips/actions";
import type { TravelStyle } from "@/types";

const TRAVEL_STYLES: TravelStyle[] = [
  "Cultural",
  "Relaxed",
  "Adventure",
  "Luxury",
  "Budget",
];

export function CreateTripModal() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [destination, setDestination] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [travelStyle, setTravelStyle] = useState<TravelStyle>("Cultural");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function close() {
    setIsOpen(false);
    setError(null);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const result = await createTrip({
      title,
      destination,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      travelStyle,
    });

    setIsSubmitting(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    close();
    router.push(`/trips/${result.data.tripId}`);
  }

  return (
    <>
      <PillButton type="button" onClick={() => setIsOpen(true)}>
        <Plus className="h-4 w-4" />
        New trip
      </PillButton>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl font-semibold text-brand-ink">
                Start a new itinerary
              </h2>
              <button
                type="button"
                onClick={close}
                aria-label="Close"
                className="text-brand-muted hover:text-brand-ink"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide text-brand-muted">
                  Trip title
                </label>
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="e.g. Kyoto in Spring"
                  required
                  className="select-input"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide text-brand-muted">
                  Destination
                </label>
                <input
                  value={destination}
                  onChange={(event) => setDestination(event.target.value)}
                  placeholder="City, Country"
                  required
                  className="select-input"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide text-brand-muted">
                    Start date
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(event) => setStartDate(event.target.value)}
                    className="select-input"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide text-brand-muted">
                    End date
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(event) => setEndDate(event.target.value)}
                    className="select-input"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide text-brand-muted">
                  Travel style
                </label>
                <select
                  value={travelStyle}
                  onChange={(event) =>
                    setTravelStyle(event.target.value as TravelStyle)
                  }
                  className="select-input"
                >
                  {TRAVEL_STYLES.map((style) => (
                    <option key={style}>{style}</option>
                  ))}
                </select>
              </div>

              {error && <p className="text-xs text-red-600">{error}</p>}

              <PillButton
                type="submit"
                disabled={isSubmitting}
                className="justify-center"
              >
                {isSubmitting ? "Creating..." : "Create itinerary"}
              </PillButton>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
