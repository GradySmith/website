// Types and constants shared between the server-only preference helpers
// (src/lib/preferences.ts, which imports next/headers and can only be
// used from Server Components/Actions) and client code (TopBar,
// PreferencesProvider) that just needs the plain values.
//
// This file must stay free of next/headers (or anything else server-only)
// — a "use client" component importing a single value from a module still
// pulls in that module's top-level imports, so if CURRENCIES lived in
// preferences.ts, TopBar.tsx importing it would drag next/headers into
// the client bundle and fail the build.

import type { Locale } from "@/lib/i18n";

export type Currency = "USD" | "CAD";

export const CURRENCIES: { value: Currency; label: string }[] = [
  { value: "USD", label: "USD ($)" },
  { value: "CAD", label: "CAD (CA$)" },
];

export function isCurrency(value: string | undefined | null): value is Currency {
  return value === "USD" || value === "CAD";
}

export const LOCALE_COOKIE = "biyahe_locale";
export const CURRENCY_COOKIE = "biyahe_currency";

export interface UserPreferences {
  locale: Locale;
  currency: Currency;
}
