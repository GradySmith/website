import { notFound } from "next/navigation";
import { RouteMapLoader } from "@/components/RouteMapLoader";
import { getTrip } from "@/lib/get-trip";
import { createClient } from "@/lib/supabase-server";
import type { ItineraryItem } from "@/types";

export default async function TripMapPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const trip = await getTrip(id);

  if (!trip) {
    notFound();
  }

  const supabase = await createClient();
  const { data: items } = await supabase
    .from("itinerary_items")
    .select("*")
    .eq("trip_id", id)
    .is("deleted_at", null)
    .order("day_number", { ascending: true })
    .order("sort_order", { ascending: true });

  const itemsByDay: Record<number, ItineraryItem[]> = {};
  for (const item of (items as ItineraryItem[]) ?? []) {
    (itemsByDay[item.day_number] ??= []).push(item);
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-brand-muted">
        Each color is a different day. Lines connect that day&apos;s activities
        in the order you added them.
      </p>
      <RouteMapLoader itemsByDay={itemsByDay} />
    </div>
  );
}
