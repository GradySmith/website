"use client";

// One day of the itinerary as a collapsible accordion card. Collapsed, it
// just shows "Day N — date" plus an optional nickname; expanded, it always
// shows the same three sections in order — Flights, Accommodation, Day
// plan — so the user can see at a glance what's reserved and what still
// needs planning, even when a section is empty.

import { useState } from "react";
import { ChevronDown, ChevronRight, Pencil, Check, X, Plane, Home, Flag } from "lucide-react";
import { updateDayNickname } from "@/app/trips/actions";
import { QuickAddItineraryItem } from "./QuickAddItineraryItem";
import { ItineraryItemRow } from "./ItineraryItemRow";
import type { ItineraryItem } from "@/types";

// Chronological within the day — items with no time are treated as
// "first thing" rather than sorted to the bottom or dropped.
function sortByTime(items: ItineraryItem[]): ItineraryItem[] {
  return [...items].sort((a, b) => {
    if (!a.start_time && !b.start_time) return a.sort_order - b.sort_order;
    if (!a.start_time) return -1;
    if (!b.start_time) return 1;
    return a.start_time.localeCompare(b.start_time) || a.sort_order - b.sort_order;
  });
}

export function ItineraryDayCard({
  tripId,
  dayNumber,
  dateLabel,
  nickname,
  items,
  availableDays,
  defaultOpen = false,
}: {
  tripId: string;
  dayNumber: number;
  dateLabel: string | null;
  nickname: string | null;
  items: ItineraryItem[];
  availableDays: { dayNumber: number; label: string }[];
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [isEditingNickname, setIsEditingNickname] = useState(false);
  const [nicknameValue, setNicknameValue] = useState(nickname ?? "");
  const [savedNickname, setSavedNickname] = useState(nickname);
  const [isSavingNickname, setIsSavingNickname] = useState(false);

  const flights = sortByTime(items.filter((item) => item.item_type === "flight"));
  const accommodation = sortByTime(items.filter((item) => item.item_type === "accommodation"));
  const activities = sortByTime(items.filter((item) => item.item_type === "activity"));

  async function handleSaveNickname() {
    setIsSavingNickname(true);
    const result = await updateDayNickname({ tripId, dayNumber, nickname: nicknameValue });
    setIsSavingNickname(false);
    if (result.success) {
      setSavedNickname(nicknameValue.trim() || null);
      setIsEditingNickname(false);
    }
  }

  function cancelNicknameEdit() {
    setNicknameValue(savedNickname ?? "");
    setIsEditingNickname(false);
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-brand-teal-100 bg-white">
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="flex flex-1 flex-wrap items-center gap-2 text-left"
        >
          {isOpen ? (
            <ChevronDown className="h-4 w-4 flex-shrink-0 text-brand-muted" strokeWidth={2} />
          ) : (
            <ChevronRight className="h-4 w-4 flex-shrink-0 text-brand-muted" strokeWidth={2} />
          )}
          <span className="font-display text-lg font-semibold text-brand-ink">Day {dayNumber}</span>
          {dateLabel && <span className="text-sm font-normal text-brand-muted">{dateLabel}</span>}
          {savedNickname && !isEditingNickname && (
            <span className="rounded-full bg-brand-teal-50 px-2.5 py-0.5 text-xs font-medium text-brand-teal-700">
              {savedNickname}
            </span>
          )}
        </button>

        {!isEditingNickname && (
          <button
            type="button"
            onClick={() => {
              setIsEditingNickname(true);
              setIsOpen(true);
            }}
            aria-label="Name this day"
            className="flex-shrink-0 text-brand-muted hover:text-brand-teal-700"
          >
            <Pencil className="h-3.5 w-3.5" strokeWidth={2} />
          </button>
        )}
      </div>

      {isEditingNickname && (
        <div className="flex items-center gap-2 border-t border-brand-teal-50 bg-brand-teal-50/40 px-4 py-2.5">
          <input
            value={nicknameValue}
            onChange={(event) => setNicknameValue(event.target.value)}
            placeholder="e.g. Beach day, Museum hopping"
            autoFocus
            className="select-input flex-1 text-sm"
          />
          <button
            type="button"
            onClick={handleSaveNickname}
            disabled={isSavingNickname}
            className="flex items-center gap-1 rounded-full bg-brand-teal-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-brand-teal-700 disabled:opacity-60"
          >
            <Check className="h-3.5 w-3.5" strokeWidth={2} />
            {isSavingNickname ? "Saving..." : "Save"}
          </button>
          <button
            type="button"
            onClick={cancelNicknameEdit}
            disabled={isSavingNickname}
            className="flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium text-brand-muted hover:bg-brand-teal-50"
          >
            <X className="h-3.5 w-3.5" strokeWidth={2} />
            Cancel
          </button>
        </div>
      )}

      {isOpen && (
        <div className="flex flex-col gap-4 border-t border-brand-teal-50 px-4 py-4">
          <div className="flex flex-col gap-2">
            <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-brand-muted">
              <Plane className="h-3.5 w-3.5" strokeWidth={2} />
              Flights
            </h3>
            {flights.length > 0 ? (
              <div className="flex flex-col gap-2">
                {flights.map((item) => (
                  <ItineraryItemRow
                    key={item.id}
                    tripId={tripId}
                    item={item}
                    availableDays={availableDays}
                    currentDayNumber={dayNumber}
                  />
                ))}
              </div>
            ) : (
              <p className="text-xs text-brand-muted">No flights booked for this day yet.</p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-brand-muted">
              <Home className="h-3.5 w-3.5" strokeWidth={2} />
              Accommodation
            </h3>
            {accommodation.length > 0 ? (
              <div className="flex flex-col gap-2">
                {accommodation.map((item) => (
                  <ItineraryItemRow
                    key={item.id}
                    tripId={tripId}
                    item={item}
                    availableDays={availableDays}
                    currentDayNumber={dayNumber}
                  />
                ))}
              </div>
            ) : (
              <p className="text-xs text-brand-muted">No accommodation booked for this night yet.</p>
            )}
            <QuickAddItineraryItem tripId={tripId} dayNumber={dayNumber} itemType="accommodation" />
          </div>

          <div className="flex flex-col gap-2">
            <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-brand-muted">
              <Flag className="h-3.5 w-3.5" strokeWidth={2} />
              Day plan
            </h3>
            {activities.length > 0 ? (
              <div className="flex flex-col gap-2">
                {activities.map((item) => (
                  <ItineraryItemRow
                    key={item.id}
                    tripId={tripId}
                    item={item}
                    availableDays={availableDays}
                    currentDayNumber={dayNumber}
                  />
                ))}
              </div>
            ) : (
              <p className="text-xs text-brand-muted">Nothing planned yet — add something below.</p>
            )}
            <QuickAddItineraryItem tripId={tripId} dayNumber={dayNumber} itemType="activity" />
          </div>
        </div>
      )}
    </div>
  );
}
