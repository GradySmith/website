"use client";

// Lists every day of the trip (from its dates when set, else the highest
// day_number already in use) as a collapsible accordion — each day shows
// Flights / Accommodation / Day plan in that order once expanded, so the
// user can add accommodation/activities straight onto a date without ever
// typing a day number themselves.

import { useState } from "react";
import { Plus } from "lucide-react";
import { ItineraryDayCard } from "./ItineraryDayCard";
import { addDaysToDateOnly } from "@/lib/date-only";
import type { ItineraryItem } from "@/types";

function dateForDay(startDate: string | null, dayNumber: number): string | null {
  if (!startDate) return null;
  return addDaysToDateOnly(startDate, dayNumber - 1).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function ItineraryDayList({
  tripId,
  items,
  startDate,
  totalDaysFromDates,
  nicknamesByDay,
}: {
  tripId: string;
  items: ItineraryItem[];
  startDate: string | null;
  totalDaysFromDates: number | null;
  nicknamesByDay: Record<number, string>;
}) {
  const maxExistingDay = items.reduce(
    (max, item) => Math.max(max, item.end_day_number ?? item.day_number),
    0
  );
  const baseDays = totalDaysFromDates ?? Math.max(1, maxExistingDay);
  const [extraDays, setExtraDays] = useState(0);
  const dayCount = Math.max(baseDays + extraDays, maxExistingDay);

  // A multi-night accommodation (end_day_number set) shows up in every
  // day's bucket it spans, not just its check-in day — same underlying
  // item, so editing or deleting it from any one of those days affects
  // the whole stay. end_day_number is the CHECKOUT day, not the last
  // night stayed — a booking Aug 27 - Aug 29 is 2 nights (27, 28), not 3,
  // since the guest leaves on the 29th rather than sleeping there. So the
  // item spans up to (but not including) its checkout day.
  const itemsByDay = new Map<number, ItineraryItem[]>();
  for (const item of items) {
    const lastNightDay =
      item.end_day_number != null ? item.end_day_number - 1 : item.day_number;
    for (let day = item.day_number; day <= lastNightDay; day++) {
      const list = itemsByDay.get(day) ?? [];
      list.push(item);
      itemsByDay.set(day, list);
    }
  }

  const days = Array.from({ length: dayCount }, (_, i) => i + 1);

  // Every day currently shown, so an item's edit form can offer "move to
  // Day N" as a dropdown instead of a free-typed number.
  const availableDays = days.map((dayNumber) => ({
    dayNumber,
    label: dateForDay(startDate, dayNumber)
      ? `Day ${dayNumber} — ${dateForDay(startDate, dayNumber)}`
      : `Day ${dayNumber}`,
  }));

  return (
    <div className="flex flex-col gap-3">
      {days.map((dayNumber) => {
        const dayItems = itemsByDay.get(dayNumber) ?? [];
        const dateLabel = dateForDay(startDate, dayNumber);

        return (
          <ItineraryDayCard
            key={dayNumber}
            tripId={tripId}
            dayNumber={dayNumber}
            dateLabel={dateLabel}
            nickname={nicknamesByDay[dayNumber] ?? null}
            items={dayItems}
            availableDays={availableDays}
            defaultOpen={dayNumber === 1 || dayItems.length > 0}
          />
        );
      })}

      <button
        type="button"
        onClick={() => setExtraDays((n) => n + 1)}
        className="flex w-fit items-center gap-1.5 rounded-full border border-dashed border-brand-teal-200 px-4 py-2 text-sm font-medium text-brand-teal-700 transition-colors hover:bg-brand-teal-50"
      >
        <Plus className="h-4 w-4" strokeWidth={2} />
        Add another day
      </button>
    </div>
  );
}
