"use client";

import { useState } from "react";
import { Compass, Sparkles, Shuffle } from "lucide-react";
import { PillButton } from "@/components/PillButton";
import { DestinationCard } from "@/components/DestinationCard";
import { LoadingHummingbird } from "@/components/LoadingHummingbird";
import { usePreferences } from "@/lib/preferences-context";
import { t } from "@/lib/i18n";
import type {
  BudgetLevel,
  DestinationQuery,
  DestinationSuggestion,
  Interest,
  TravelStyle,
} from "@/types";

const INTERESTS: Interest[] = [
  "Beaches",
  "Mountains",
  "Cities",
  "Culture",
  "Food",
  "Nightlife",
  "Nature",
  "History",
  "Adventure",
  "Shopping",
  "Wellness",
  "Cold weather",
  "Warm weather",
];

const REGIONS = ["Anywhere", "Asia", "Europe", "Americas", "Africa", "Oceania"];

const TRAVEL_STYLES: TravelStyle[] = [
  "Cultural",
  "Relaxed",
  "Adventure",
  "Luxury",
  "Budget",
];

const DURATIONS = ["Weekend", "3-4 days", "1 week", "2 weeks", "1 month+"];

const MONTHS = [
  "Any month",
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const BUDGETS: BudgetLevel[] = ["Budget", "Mid-range", "Luxury"];

function randomFrom<T>(options: T[]): T {
  return options[Math.floor(Math.random() * options.length)];
}

// Random interest count 1-3, no repeats.
function randomInterests(): Interest[] {
  const shuffled = [...INTERESTS].sort(() => Math.random() - 0.5);
  const count = 1 + Math.floor(Math.random() * 3);
  return shuffled.slice(0, count);
}

export function DiscoverForm() {
  const { locale } = usePreferences();
  const [selectedInterests, setSelectedInterests] = useState<Interest[]>([
    "Culture",
    "Food",
  ]);
  const [region, setRegion] = useState("Anywhere");
  const [travelStyle, setTravelStyle] = useState<TravelStyle>("Cultural");
  const [duration, setDuration] = useState("1 week");
  const [month, setMonth] = useState("Any month");
  const [budget, setBudget] = useState<BudgetLevel>("Mid-range");
  const [isLoading, setIsLoading] = useState(false);
  const [isRandomizing, setIsRandomizing] = useState(false);
  const [suggestions, setSuggestions] = useState<DestinationSuggestion[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  function toggleInterest(interest: Interest) {
    setSelectedInterests((prev) =>
      prev.includes(interest)
        ? prev.filter((i) => i !== interest)
        : [...prev, interest]
    );
  }

  async function fetchSuggestions(query: DestinationQuery) {
    setError(null);
    try {
      const res = await fetch("/api/suggest-destinations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(query),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Try again.");
        setSuggestions([]);
        return;
      }

      setSuggestions(data.destinations ?? []);
    } catch {
      setError("Couldn't reach the server. Is npm run dev still running?");
      setSuggestions([]);
    } finally {
      setHasSearched(true);
    }
  }

  async function handleSuggest() {
    setIsLoading(true);
    await fetchSuggestions({
      interests: selectedInterests,
      region,
      travelStyle,
      duration,
      month,
      budget,
    });
    setIsLoading(false);
  }

  // Ignores whatever's currently picked in the form and rolls a fresh,
  // random set of filters instead — updates the form to show what got
  // picked, then fetches with those.
  async function handleRandomize() {
    setIsRandomizing(true);

    const query: DestinationQuery = {
      interests: randomInterests(),
      region: randomFrom(REGIONS),
      travelStyle: randomFrom(TRAVEL_STYLES),
      duration: randomFrom(DURATIONS),
      month: randomFrom(MONTHS),
      budget: randomFrom(BUDGETS),
    };

    setSelectedInterests(query.interests);
    setRegion(query.region);
    setTravelStyle(query.travelStyle);
    setDuration(query.duration);
    setMonth(query.month);
    setBudget(query.budget);

    await fetchSuggestions(query);
    setIsRandomizing(false);
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-3xl bg-gradient-to-br from-brand-teal-100 via-brand-teal-50 to-brand-mint-200 px-8 py-10">
        <p className="flex items-center gap-2 text-sm font-medium text-brand-teal-700">
          <Compass className="h-4 w-4" />
          Discover your next journey
        </p>
        <h1 className="mt-2 font-display text-4xl font-semibold text-brand-teal-900">
          {t(locale, "discover_heading")}
        </h1>
        <p className="mt-3 max-w-lg text-brand-muted">
          Tell us what you love and we&apos;ll surface destinations that
          match — then turn any idea into a plan you can build on.
        </p>
      </section>

      <section className="rounded-3xl border border-brand-teal-100 bg-white p-8">
        <h2 className="font-display text-xl font-semibold text-brand-ink">
          Find your match
        </h2>
        <p className="mt-1 text-sm text-brand-muted">
          Pick what excites you — we&apos;ll do the rest.
        </p>

        <div className="mt-6">
          <label className="text-xs font-semibold uppercase tracking-wide text-brand-muted">
            Interests
          </label>
          <div className="mt-3 flex flex-wrap gap-2">
            {INTERESTS.map((interest) => {
              const isSelected = selectedInterests.includes(interest);
              return (
                <button
                  key={interest}
                  type="button"
                  onClick={() => toggleInterest(interest)}
                  className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                    isSelected
                      ? "border-brand-teal-600 bg-brand-teal-600 text-white"
                      : "border-brand-teal-100 bg-white text-brand-ink hover:border-brand-teal-300"
                  }`}
                >
                  {interest}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Region">
            <select
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className="select-input"
            >
              {REGIONS.map((opt) => (
                <option key={opt}>{opt}</option>
              ))}
            </select>
          </Field>

          <Field label="Travel style">
            <select
              value={travelStyle}
              onChange={(e) => setTravelStyle(e.target.value as TravelStyle)}
              className="select-input"
            >
              {TRAVEL_STYLES.map((opt) => (
                <option key={opt}>{opt}</option>
              ))}
            </select>
          </Field>

          <Field label="Duration">
            <select
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="select-input"
            >
              {DURATIONS.map((opt) => (
                <option key={opt}>{opt}</option>
              ))}
            </select>
          </Field>

          <Field label="Month">
            <select
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="select-input"
            >
              {MONTHS.map((opt) => (
                <option key={opt}>{opt}</option>
              ))}
            </select>
          </Field>

          <Field label="Budget">
            <select
              value={budget}
              onChange={(e) => setBudget(e.target.value as BudgetLevel)}
              className="select-input"
            >
              {BUDGETS.map((opt) => (
                <option key={opt}>{opt}</option>
              ))}
            </select>
          </Field>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <PillButton onClick={handleSuggest} disabled={isLoading || isRandomizing}>
            <Sparkles className="h-4 w-4" />
            {isLoading ? "Thinking..." : "Suggest destinations"}
          </PillButton>
          <PillButton
            variant="secondary"
            onClick={handleRandomize}
            disabled={isLoading || isRandomizing}
          >
            <Shuffle className="h-4 w-4" />
            {isRandomizing ? "Rolling the dice..." : "Random generation"}
          </PillButton>
        </div>
      </section>

      {error && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {(isLoading || isRandomizing) && (
        <LoadingHummingbird
          label={
            isRandomizing
              ? "Rolling the dice on a destination..."
              : "Finding destinations that fit what you picked..."
          }
        />
      )}

      {!isLoading && !isRandomizing && suggestions.length > 0 && (
        <section className="flex flex-col gap-4">
          <h2 className="font-display text-xl font-semibold text-brand-ink">
            Matches for you
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {suggestions.map((destination) => (
              <DestinationCard key={destination.name} destination={destination} />
            ))}
          </div>
        </section>
      )}

      {!isLoading && !isRandomizing && !error && hasSearched && suggestions.length === 0 && (
        <p className="text-center text-sm text-brand-muted">
          No matches came back — try widening your filters.
        </p>
      )}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold uppercase tracking-wide text-brand-muted">
        {label}
      </label>
      {children}
    </div>
  );
}
