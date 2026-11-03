"use client";

import dynamic from "next/dynamic";
import type { ItineraryItem } from "@/types";

// Leaflet touches `window` at import time, which crashes server-side
// rendering — this dynamic import with ssr:false has to live in a
// Client Component (not allowed directly in a Server Component), so the
// map page renders this wrapper and this wrapper loads the real map.
const RouteMap = dynamic(
  () => import("./RouteMap").then((mod) => mod.RouteMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-96 items-center justify-center rounded-2xl border border-brand-teal-100 bg-brand-teal-50/40 text-sm text-brand-muted">
        Loading map...
      </div>
    ),
  }
);

export function RouteMapLoader({
  itemsByDay,
}: {
  itemsByDay: Record<number, ItineraryItem[]>;
}) {
  return <RouteMap itemsByDay={itemsByDay} />;
}
