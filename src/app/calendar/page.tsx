import { Calendar as CalendarIcon } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";

export default function CalendarPage() {
  return (
    <EmptyState
      icon={CalendarIcon}
      title="Calendar"
      description="A unified view of every trip, flight, and reservation by date — coming once trips and bookings are wired up."
    />
  );
}
