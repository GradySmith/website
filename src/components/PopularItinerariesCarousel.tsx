"use client";

// Popular itineraries banner: shows a sliding window of 3 destination
// cards at a time. Each arrow click rotates the window by exactly one
// destination — one card leaves from that side, the next one in line
// appears on the other side — rather than paging through in groups of 3.

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DestinationCard } from "@/components/DestinationCard";
import type { DestinationSuggestion } from "@/types";

const VISIBLE_COUNT = 3;

export function PopularItinerariesCarousel({
  destinations,
}: {
  destinations: DestinationSuggestion[];
}) {
  const [start, setStart] = useState(0);

  if (destinations.length === 0) return null;

  const total = destinations.length;
  const visibleCount = Math.min(VISIBLE_COUNT, total);
  const canRotate = total > visibleCount;

  function shift(delta: number) {
    setStart((current) => (current + delta + total) % total);
  }

  // Window of `visibleCount` destinations starting at `start`, wrapping
  // around the end of the list back to the beginning.
  const visible = Array.from(
    { length: visibleCount },
    (_, i) => destinations[(start + i) % total]
  );

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex w-full items-center gap-3 sm:gap-4">
        <button
          type="button"
          onClick={() => shift(-1)}
          aria-label="Rotate to the previous itinerary"
          disabled={!canRotate}
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-brand-teal-100 bg-white text-brand-teal-700 shadow-sm transition-colors hover:bg-brand-teal-50 disabled:cursor-default disabled:opacity-40 disabled:hover:bg-white"
        >
          <ChevronLeft className="h-4 w-4" strokeWidth={2} />
        </button>

        <div className="grid min-w-0 flex-1 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((destination) => (
            <DestinationCard key={destination.name} destination={destination} />
          ))}
        </div>

        <button
          type="button"
          onClick={() => shift(1)}
          aria-label="Rotate to the next itinerary"
          disabled={!canRotate}
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-brand-teal-100 bg-white text-brand-teal-700 shadow-sm transition-colors hover:bg-brand-teal-50 disabled:cursor-default disabled:opacity-40 disabled:hover:bg-white"
        >
          <ChevronRight className="h-4 w-4" strokeWidth={2} />
        </button>
      </div>

      {canRotate && (
        <div className="flex items-center justify-center gap-1.5">
          {destinations.map((destination, i) => (
            <button
              key={destination.name}
              type="button"
              onClick={() => setStart(i)}
              aria-label={`Rotate so ${destination.name}, ${destination.country} leads`}
              aria-current={i === start}
              className={`h-1.5 rounded-full transition-all ${
                i === start ? "w-6 bg-brand-teal-600" : "w-1.5 bg-brand-teal-100"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
