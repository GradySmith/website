import { notFound } from "next/navigation";
import { TripBudgetPanel } from "@/components/TripBudgetPanel";
import { getTrip } from "@/lib/get-trip";
import { createClient } from "@/lib/supabase-server";
import type { Booking } from "@/types";

export default async function TripBudgetPage({
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
  const { data: bookings } = await supabase
    .from("bookings")
    .select("*")
    .eq("trip_id", id)
    .is("deleted_at", null);

  return <TripBudgetPanel trip={trip} bookings={(bookings as Booking[]) ?? []} />;
}
