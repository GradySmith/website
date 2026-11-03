"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Calendar, Wallet, Bookmark } from "lucide-react";
import { PhotoCarousel } from "./PhotoCarousel";
import { PillButton } from "./PillButton";
import { saveTrip } from "@/app/trips/actions";
import { usePreferences } from "@/lib/preferences-context";
import { convertMoneyString } from "@/lib/currency-format";
import type { DestinationSuggestion } from "@/types";

type SaveStatus = "idle" | "saving" | "error";

export function DestinationCard({
  destination,
}: {
  destination: DestinationSuggestion;
}) {
  const router = useRouter();
  const { currency, exchangeRate } = usePreferences();
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handlePlanTrip() {
    setStatus("saving");
    setErrorMessage(null);

    const result = await saveTrip({
      destination: `${destination.name}, ${destination.country}`,
      coverImageUrl: destination.photos[0]?.url,
    });

    if (result.success) {
      router.push(`/trips/${result.data.tripId}`);
    } else {
      setStatus("error");
      setErrorMessage(result.error);
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-brand-teal-100 bg-white p-5">
      <PhotoCarousel
        photos={destination.photos}
        alt={`${destination.name}, ${destination.country}`}
      />

      <div>
        <h3 className="font-display text-lg font-semibold text-brand-ink">
          {destination.name}, {destination.country}
        </h3>
        {destination.pronunciation && (
          <p className="text-xs text-brand-muted">/{destination.pronunciation}/</p>
        )}
      </div>

      <p className="text-sm text-brand-ink">{destination.summary}</p>

      {destination.highlights?.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {destination.highlights.map((highlight) => (
            <span
              key={highlight}
              className="rounded-full bg-brand-teal-50 px-3 py-1 text-xs font-medium text-brand-teal-700"
            >
              {highlight}
            </span>
          ))}
        </div>
      )}

      <div className="mt-1 grid grid-cols-2 gap-3 border-t border-brand-teal-100 pt-3">
        <div>
          <p className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-brand-muted">
            <Calendar className="h-3.5 w-3.5" strokeWidth={2} />
            When
          </p>
          <p className="mt-1 text-sm text-brand-ink">
            {destination.bestTimeToVisit}
          </p>
        </div>
        <div>
          <p className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-brand-muted">
            <Wallet className="h-3.5 w-3.5" strokeWidth={2} />
            Cost
          </p>
          <p className="mt-1 text-sm text-brand-ink">
            {convertMoneyString(
              destination.estimatedBudgetPerPerson,
              currency,
              exchangeRate
            )}
          </p>
        </div>
      </div>

      <PillButton
        type="button"
        variant="primary"
        onClick={handlePlanTrip}
        disabled={status === "saving"}
        className="mt-1 justify-center"
      >
        <Bookmark className="h-4 w-4" />
        {status === "saving" ? "Planning..." : "Plan this trip"}
      </PillButton>

      {status === "error" && errorMessage && (
        <p className="text-xs text-red-600">{errorMessage}</p>
      )}
    </div>
  );
}
