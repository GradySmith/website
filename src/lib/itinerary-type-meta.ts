// Shared icon/label/color per itinerary item type — used by ItineraryItemRow,
// the Trash view, and anywhere else that needs to render one consistently.

import { Home, Flag, Plane } from "lucide-react";
import type { ItineraryItemType } from "@/types";

export const ITEM_TYPE_META: Record<
  ItineraryItemType,
  { icon: typeof Flag; label: string; badgeClass: string }
> = {
  flight: { icon: Plane, label: "Flight", badgeClass: "bg-violet-100 text-violet-700" },
  accommodation: { icon: Home, label: "Accommodation", badgeClass: "bg-sky-100 text-sky-700" },
  activity: { icon: Flag, label: "Activity", badgeClass: "bg-brand-teal-100 text-brand-teal-700" },
};
