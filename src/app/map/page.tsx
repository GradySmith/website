"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Route, MapPin } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { RouteMapLoader } from "@/components/RouteMapLoader";
import { createClient as createBrowserClient } from "@/lib/supabase";
import { usePreferences } from "@/lib/preferences-context";
import { t } from "@/lib/i18n";
import type { ItineraryItem, Trip } from "@/types";

interface TripOption {
  id: string;
  title: string | null;
  destination: string;
}

function MapPageContent() {
  const { locale } = usePreferences();
  const [supabase] = useState(() => createBrowserClient());
  const router = useRouter();
  const searchParams = useSearchParams();
  const tripParam = searchParams.get("trip");

  const [trips, setTrips] = useState<TripOption[]>([]);
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [trip, setTrip] = useState<Trip | null>(null);
  const [items, setItems] = useState<ItineraryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load the trip list once, then settle on either the ?trip= from the
  // URL (so this page is linkable/bookmarkable per trip) or the most
  // recent trip.
  useEffect(() => {
    let isCancelled = false;

    async function loadTrips() {
      const { data } = await supabase
        .from("trips")
        .select("id, title, destination")
        .order("created_at", { ascending: false });

      if (isCancelled) return;
      const options = (data as TripOption[]) ?? [];
      setTrips(options);

      if (options.length === 0) {
        setIsLoading(false);
        return;
      }

      const initial =
        (tripParam && options.some((option) => option.id === tripParam)
          ? tripParam
          : options[0].id) ?? null;
      setSelectedTripId(initial);
    }

    loadTrips();
    return () => {
      isCancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

  useEffect(() => {
    if (!selectedTripId) return;
    let isCancelled = false;
    setIsLoading(true);

    async function loadTripDetails() {
      const [{ data: tripData }, { data: itemsData }] = await Promise.all([
        supabase.from("trips").select("*").eq("id", selectedTripId).single(),
        supabase
          .from("itinerary_items")
          .select("*")
          .eq("trip_id", selectedTripId)
          .is("deleted_at", null)
          .order("day_number", { ascending: true })
          .order("sort_order", { ascending: true }),
      ]);

      if (isCancelled) return;
      setTrip(tripData as Trip | null);
      setItems((itemsData as ItineraryItem[]) ?? []);
      setIsLoading(false);
    }

    loadTripDetails();
    return () => {
      isCancelled = true;
    };
  }, [selectedTripId, supabase]);

  function handleSelectTrip(tripId: string) {
    setSelectedTripId(tripId);
    router.replace(`/map?trip=${tripId}`, { scroll: false });
  }

  if (isLoading && trips.length === 0) {
    return <p className="text-center text-sm text-brand-muted">Loading...</p>;
  }

  if (trips.length === 0) {
    return (
      <EmptyState
        icon={Route}
        title="Route Map"
        description="Save or create a trip first, then come back here to see its day-by-day route."
      />
    );
  }

  const itemsByDay: Record<number, ItineraryItem[]> = {};
  for (const item of items) {
    (itemsByDay[item.day_number] ??= []).push(item);
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold text-brand-ink">
            {t(locale, "map_heading")}
          </h1>
          {trip && (
            <p className="mt-1 flex items-center gap-1 text-sm text-brand-muted">
              <MapPin className="h-3.5 w-3.5" />
              {trip.title || trip.destination}
            </p>
          )}
        </div>
        <select
          value={selectedTripId ?? ""}
          onChange={(event) => handleSelectTrip(event.target.value)}
          className="select-input"
        >
          {trips.map((option) => (
            <option key={option.id} value={option.id}>
              {option.title || option.destination}
            </option>
          ))}
        </select>
      </div>

      <p className="text-sm text-brand-muted">
        Each color is a different day. Lines connect that day&apos;s
        activities in the order you added them.
      </p>

      <RouteMapLoader itemsByDay={itemsByDay} />
    </div>
  );
}

export default function MapPage() {
  return (
    <Suspense
      fallback={<p className="text-center text-sm text-brand-muted">Loading...</p>}
    >
      <MapPageContent />
    </Suspense>
  );
}
