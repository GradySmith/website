"use client";

import { useEffect, useState } from "react";
import { Wallet } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { TripBudgetPanel } from "@/components/TripBudgetPanel";
import { createClient as createBrowserClient } from "@/lib/supabase";
import { usePreferences } from "@/lib/preferences-context";
import { t } from "@/lib/i18n";
import type { Booking, Trip } from "@/types";

interface TripOption {
  id: string;
  title: string | null;
  destination: string;
}

export default function BudgetPage() {
  const { locale } = usePreferences();
  const [supabase] = useState(() => createBrowserClient());

  const [trips, setTrips] = useState<TripOption[]>([]);
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [trip, setTrip] = useState<Trip | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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
      if (options.length > 0) {
        setSelectedTripId((current) => current ?? options[0].id);
      } else {
        setIsLoading(false);
      }
    }

    loadTrips();
    return () => {
      isCancelled = true;
    };
  }, [supabase]);

  useEffect(() => {
    if (!selectedTripId) return;
    let isCancelled = false;
    setIsLoading(true);

    async function loadTripDetails() {
      const [{ data: tripData }, { data: bookingsData }] = await Promise.all([
        supabase.from("trips").select("*").eq("id", selectedTripId).single(),
        supabase
          .from("bookings")
          .select("*")
          .eq("trip_id", selectedTripId)
          .is("deleted_at", null),
      ]);

      if (isCancelled) return;

      setTrip(tripData as Trip | null);
      setBookings((bookingsData as Booking[]) ?? []);
      setIsLoading(false);
    }

    loadTripDetails();
    return () => {
      isCancelled = true;
    };
  }, [selectedTripId, supabase]);

  if (isLoading && trips.length === 0) {
    return <p className="text-center text-sm text-brand-muted">Loading...</p>;
  }

  if (trips.length === 0) {
    return (
      <EmptyState
        icon={Wallet}
        title="Budget"
        description="Save or create a trip first, then come back here to break down its costs."
      />
    );
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold text-brand-ink">
            {t(locale, "budget_heading")}
          </h1>
          <p className="mt-1 text-sm text-brand-muted">Full cost breakdown for your trip.</p>
        </div>
        <select
          value={selectedTripId ?? ""}
          onChange={(event) => setSelectedTripId(event.target.value)}
          className="select-input"
        >
          {trips.map((option) => (
            <option key={option.id} value={option.id}>
              {option.title || option.destination}
            </option>
          ))}
        </select>
      </div>

      {trip && <TripBudgetPanel key={trip.id} trip={trip} bookings={bookings} />}
    </div>
  );
}
