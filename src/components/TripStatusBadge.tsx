import type { TripStatus } from "@/types";

const STATUS_STYLES: Record<TripStatus, string> = {
  planning: "bg-amber-100 text-amber-700",
  confirmed: "bg-emerald-100 text-emerald-700",
  completed: "bg-slate-100 text-slate-600",
};

const STATUS_LABELS: Record<TripStatus, string> = {
  planning: "Planning",
  confirmed: "Confirmed",
  completed: "Completed",
};

export function TripStatusBadge({ status }: { status: TripStatus }) {
  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-medium ${STATUS_STYLES[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
