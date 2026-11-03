"use client";

// The actual editable budget breakdown (estimated total, overall costs,
// by-category bars) for a single trip — shared between the standalone
// /budget page (which adds its own trip-selector around this) and the
// Budget tab inside a trip's page (/trips/[id]/budget), which already
// knows which trip it's on and just renders this directly.

import { useState } from "react";
import { Plane, Landmark } from "lucide-react";
import { updateTripBudget } from "@/app/trips/actions";
import { usePreferences } from "@/lib/preferences-context";
import { formatCurrency, toDisplayAmount, fromDisplayAmount } from "@/lib/currency-format";
import { parseDateOnly } from "@/lib/date-only";
import type { Booking, Trip } from "@/types";

function tripDays(trip: Trip): number {
  if (!trip.start_date || !trip.end_date) return 1;
  const start = parseDateOnly(trip.start_date);
  const end = parseDateOnly(trip.end_date);
  const diff = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  return Math.max(1, diff);
}

export function TripBudgetPanel({ trip, bookings }: { trip: Trip; bookings: Booking[] }) {
  const { currency, exchangeRate } = usePreferences();

  const [visaFees, setVisaFees] = useState(trip.visa_fees ?? 0);
  const [foodPerDay, setFoodPerDay] = useState(trip.food_per_day ?? 0);
  const [beveragesPerDay, setBeveragesPerDay] = useState(trip.beverages_per_day ?? 0);
  const [splurgeTotal, setSplurgeTotal] = useState(trip.splurge_total ?? 0);
  const [budgetAmount, setBudgetAmount] = useState<number | "">(trip.budget_amount ?? "");

  async function persistBudget(
    overrides: Partial<{
      visaFees: number;
      foodPerDay: number;
      beveragesPerDay: number;
      splurgeTotal: number;
      budgetAmount: number | null;
    }> = {}
  ) {
    const result = await updateTripBudget({
      tripId: trip.id,
      visaFees: overrides.visaFees ?? visaFees,
      foodPerDay: overrides.foodPerDay ?? foodPerDay,
      beveragesPerDay: overrides.beveragesPerDay ?? beveragesPerDay,
      splurgeTotal: overrides.splurgeTotal ?? splurgeTotal,
      budgetAmount:
        overrides.budgetAmount !== undefined
          ? overrides.budgetAmount
          : budgetAmount === ""
            ? null
            : budgetAmount,
    });

    if (!result.success) {
      console.error("Failed to save budget:", result.error);
    }
  }

  // Confirming a booking only offers Flight / Accommodation / Activity, but
  // older bookings can still carry a legacy "car" or "other" type — those
  // count as activities here too, so nothing confirmed ever goes missing
  // from the estimated total.
  const isFlight = (b: Booking) => b.type === "flight";
  const isAccommodation = (b: Booking) => b.type === "hotel";
  const isActivity = (b: Booking) => !isFlight(b) && !isAccommodation(b);

  const flightsTotal = bookings.filter(isFlight).reduce((sum, b) => sum + (b.cost ?? 0), 0);
  const accommodationTotal = bookings
    .filter(isAccommodation)
    .reduce((sum, b) => sum + (b.cost ?? 0), 0);
  const activitiesTotal = bookings.filter(isActivity).reduce((sum, b) => sum + (b.cost ?? 0), 0);
  const flightsCount = bookings.filter(isFlight).length;
  const hotelCount = bookings.filter(isAccommodation).length;
  const activitiesCount = bookings.filter(isActivity).length;

  const days = tripDays(trip);
  const foodTotal = foodPerDay * days;
  const beveragesTotal = beveragesPerDay * days;

  const estimatedTotal =
    flightsTotal + visaFees + accommodationTotal + activitiesTotal + foodTotal + beveragesTotal + splurgeTotal;
  const perDayExclFlightsVisa = days > 0 ? (estimatedTotal - flightsTotal - visaFees) / days : 0;
  const budgetDiff = typeof budgetAmount === "number" ? budgetAmount - estimatedTotal : null;

  const categories = [
    {
      label: "Flights",
      amount: flightsTotal,
      color: "bg-violet-300",
      note: `${flightsCount} flight booking(s)`,
    },
    {
      label: "Accommodation",
      amount: accommodationTotal,
      color: "bg-pink-300",
      note: `${hotelCount} accommodation booking(s)`,
    },
    {
      label: "Activities & Tours",
      amount: activitiesTotal,
      color: "bg-emerald-300",
      note: `${activitiesCount} activity booking(s)`,
    },
    {
      label: "Food",
      amount: foodTotal,
      color: "bg-amber-300",
      note: `${formatCurrency(foodPerDay || 0, currency, exchangeRate)}/day × ${days} days`,
    },
    {
      label: "Beverages",
      amount: beveragesTotal,
      color: "bg-amber-200",
      note: `${formatCurrency(beveragesPerDay || 0, currency, exchangeRate)}/day × ${days} days`,
    },
    {
      label: "Splurge & Souvenirs",
      amount: splurgeTotal,
      color: "bg-rose-300",
      note: "One-time estimate",
    },
  ];

  const maxCategoryAmount = Math.max(1, ...categories.map((c) => c.amount));

  const displayBudgetAmount =
    budgetAmount === "" ? "" : toDisplayAmount(budgetAmount, currency, exchangeRate);
  const displayVisaFees = toDisplayAmount(visaFees, currency, exchangeRate);
  const displayFoodPerDay = toDisplayAmount(foodPerDay, currency, exchangeRate);
  const displayBeveragesPerDay = toDisplayAmount(beveragesPerDay, currency, exchangeRate);
  const displaySplurgeTotal = toDisplayAmount(splurgeTotal, currency, exchangeRate);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 rounded-3xl bg-gradient-to-br from-brand-teal-100 via-brand-teal-50 to-brand-mint-200 px-8 py-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-teal-700">
            Estimated total
          </p>
          <p className="font-display text-4xl font-semibold text-brand-teal-900">
            {formatCurrency(estimatedTotal, currency, exchangeRate)}
          </p>
          <p className="mt-1 text-sm text-brand-teal-700">
            {days}-day trip · {formatCurrency(perDayExclFlightsVisa, currency, exchangeRate)}/day
            (excl. flights &amp; visa)
          </p>
        </div>
        <div className="text-right">
          <label className="block text-xs font-semibold uppercase tracking-wide text-brand-teal-700">
            Trip budget ({currency})
          </label>
          <input
            type="number"
            min={0}
            value={displayBudgetAmount}
            onChange={(event) => {
              const raw = event.target.value;
              setBudgetAmount(
                raw === "" ? "" : fromDisplayAmount(Number(raw), currency, exchangeRate)
              );
            }}
            onBlur={() =>
              persistBudget({ budgetAmount: budgetAmount === "" ? null : budgetAmount })
            }
            placeholder="Set a budget"
            className="mt-1 w-32 rounded-lg border border-brand-teal-200 bg-white/80 px-2 py-1 text-right text-sm"
          />
          {budgetDiff != null && (
            <p
              className={`mt-1 text-sm font-medium ${
                budgetDiff >= 0 ? "text-emerald-700" : "text-red-600"
              }`}
            >
              {budgetDiff >= 0 ? "Under" : "Over"} by{" "}
              {formatCurrency(Math.abs(budgetDiff), currency, exchangeRate)}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-brand-teal-100 bg-white p-6">
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-brand-ink">
            <Plane className="h-4 w-4 text-brand-teal-600" />
            Overall costs
          </h2>
          <p className="mt-1 text-xs text-brand-muted">One-time costs, not counted per day.</p>

          <div className="mt-4 flex items-center justify-between text-sm">
            <span className="text-brand-ink">Flights</span>
            <span className="font-medium text-brand-ink">
              {formatCurrency(flightsTotal, currency, exchangeRate)}
            </span>
          </div>
          <div className="mt-3 flex items-center justify-between text-sm">
            <span className="text-brand-ink">Visa fees ({currency})</span>
            <input
              type="number"
              min={0}
              value={displayVisaFees}
              onChange={(event) =>
                setVisaFees(fromDisplayAmount(Number(event.target.value), currency, exchangeRate))
              }
              onBlur={() => persistBudget({ visaFees })}
              className="w-24 rounded-lg border border-brand-teal-100 bg-brand-sand-50 px-2 py-1 text-right text-sm"
            />
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-brand-teal-100 pt-3 text-sm font-semibold">
            <span>Subtotal</span>
            <span>{formatCurrency(flightsTotal + visaFees, currency, exchangeRate)}</span>
          </div>
        </div>

        <div className="rounded-2xl border border-brand-teal-100 bg-white p-6">
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-brand-ink">
            <Landmark className="h-4 w-4 text-brand-teal-600" />
            By category
          </h2>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-brand-muted">Food / day ({currency})</label>
              <input
                type="number"
                min={0}
                value={displayFoodPerDay}
                onChange={(event) =>
                  setFoodPerDay(
                    fromDisplayAmount(Number(event.target.value), currency, exchangeRate)
                  )
                }
                onBlur={() => persistBudget({ foodPerDay })}
                placeholder="e.g. 40"
                className="select-input"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-brand-muted">Beverages / day ({currency})</label>
              <input
                type="number"
                min={0}
                value={displayBeveragesPerDay}
                onChange={(event) =>
                  setBeveragesPerDay(
                    fromDisplayAmount(Number(event.target.value), currency, exchangeRate)
                  )
                }
                onBlur={() => persistBudget({ beveragesPerDay })}
                placeholder="e.g. 15"
                className="select-input"
              />
            </div>
          </div>

          <div className="mt-3 flex flex-col gap-1">
            <label className="text-xs text-brand-muted">
              Splurge &amp; Souvenirs (total, {currency})
            </label>
            <input
              type="number"
              min={0}
              value={displaySplurgeTotal}
              onChange={(event) =>
                setSplurgeTotal(
                  fromDisplayAmount(Number(event.target.value), currency, exchangeRate)
                )
              }
              onBlur={() => persistBudget({ splurgeTotal })}
              placeholder="e.g. 200"
              className="select-input"
            />
          </div>

          <div className="mt-5 flex flex-col gap-4">
            {categories.map((category) => (
              <div key={category.label}>
                <div className="flex items-center justify-between text-sm">
                  <span className="rounded-full bg-brand-teal-50 px-2.5 py-0.5 text-xs font-medium text-brand-teal-700">
                    {category.label}
                  </span>
                  <span className="font-medium text-brand-ink">
                    {formatCurrency(category.amount, currency, exchangeRate)}
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-brand-teal-50">
                  <div
                    className={`h-full ${category.color}`}
                    style={{ width: `${(category.amount / maxCategoryAmount) * 100}%` }}
                  />
                </div>
                <p className="mt-1 text-xs text-brand-muted">{category.note}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
