// Pure formatting helpers — no "use client" needed, safe to call from
// Server or Client Components. Everything in the database is stored in
// USD; these only affect what gets displayed.

import type { Currency } from "@/lib/preferences-shared";

const CURRENCY_SYMBOLS: Record<Currency, string> = {
  USD: "$",
  CAD: "CA$",
};

// Converts a USD amount to the target currency and formats it with the
// right symbol and thousands separators. `usdToCadRate` is USD->CAD; a
// USD display just passes the amount through unconverted.
//
// The locale here MUST be explicit. This runs in both Server and Client
// Components, and `Number.prototype.toLocaleString()` with no locale
// argument falls back to the runtime's default locale — which can differ
// between the Node server (SSR) and the browser (hydration), producing a
// different-looking number (e.g. different thousands separator) on each
// side and triggering a React hydration mismatch.
export function formatCurrency(
  amountUsd: number,
  currency: Currency,
  usdToCadRate: number
): string {
  const converted = currency === "CAD" ? amountUsd * usdToCadRate : amountUsd;
  const rounded = Math.round(converted);
  return `${CURRENCY_SYMBOLS[currency]}${rounded.toLocaleString("en-US")}`;
}

// For editable money inputs (Budget tab): the number a user types needs to
// round-trip through whichever currency is selected, while storage/backend
// logic (updateTripBudget) always deals in plain USD numbers. These two
// convert a raw number (not a formatted string) between USD and the
// display currency, rounded to cents so repeated edits don't drift from
// floating-point noise.
export function toDisplayAmount(
  amountUsd: number,
  currency: Currency,
  usdToCadRate: number
): number {
  const converted = currency === "CAD" ? amountUsd * usdToCadRate : amountUsd;
  return Math.round(converted * 100) / 100;
}

export function fromDisplayAmount(
  displayAmount: number,
  currency: Currency,
  usdToCadRate: number
): number {
  const usd = currency === "CAD" ? displayAmount / usdToCadRate : displayAmount;
  return Math.round(usd * 100) / 100;
}

// AI-generated budget estimates come back as free text like "$1,200-1,800"
// or "$900" — this finds every $<number> token and converts it in place,
// so a CAD-preference user sees "$1,644-2,466" instead of the raw USD
// string. Anything that isn't a recognizable $<number> is left untouched.
export function convertMoneyString(
  text: string,
  currency: Currency,
  usdToCadRate: number
): string {
  if (currency === "USD") return text;

  return text.replace(/\$\s?([\d,]+(?:\.\d+)?)/g, (match, numberPart: string) => {
    const amount = Number(numberPart.replace(/,/g, ""));
    if (Number.isNaN(amount)) return match;
    return formatCurrency(amount, currency, usdToCadRate);
  });
}
