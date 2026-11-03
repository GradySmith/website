// Shared trip lookup for the /trips/[id] tab layout — wrapped in React's
// cache() so the layout (header/tabs) and whichever tab page is active
// can both call getTrip(id) without issuing the same Supabase query
// twice in the same request (React dedupes by arguments automatically
// within one render pass).

import { cache } from "react";
import { createClient } from "@/lib/supabase-server";
import type { Trip } from "@/types";

export const getTrip = cache(async (tripId: string): Promise<Trip | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("trips")
    .select("*")
    .eq("id", tripId)
    .single();

  if (error || !data) return null;
  return data as Trip;
});
