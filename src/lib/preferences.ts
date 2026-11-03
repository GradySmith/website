// Server-only preference helpers — persisted per-user in Supabase
// (user_preferences table) but read on every request via cookies, since
// Server Components can't query Supabase for free on every page without
// adding a DB round trip everywhere. Cookies only get WRITTEN in two
// places, both of which are allowed to (Server Actions / Route Handlers,
// never a plain Server Component render):
//   1. src/app/actions/preferences.ts — whenever the user changes the
//      TopBar dropdowns, which also upserts the Supabase row.
//   2. Right after sign-in (src/app/login/actions.ts, src/app/auth/callback/route.ts)
//      — seeds the cookies from whatever's already stored in Supabase,
//      so a returning user on a new device gets their preference back.
//
// This file imports next/headers, so it can only be imported from Server
// Components/Actions/Route Handlers — never from a "use client" file. The
// plain types/constants (Currency, CURRENCIES, isCurrency, ...) that
// client code also needs live in src/lib/preferences-shared.ts instead,
// specifically to avoid that trap.

import { cookies } from "next/headers";
import { type Locale, isLocale } from "@/lib/i18n";
import type { createClient } from "@/lib/supabase-server";
import {
  type Currency,
  type UserPreferences,
  isCurrency,
  LOCALE_COOKIE,
  CURRENCY_COOKIE,
  CURRENCIES,
} from "@/lib/preferences-shared";

// Re-exported so existing server-side imports of "@/lib/preferences"
// don't need to also import from preferences-shared directly.
export type { Currency, UserPreferences };
export { isCurrency, CURRENCIES, LOCALE_COOKIE, CURRENCY_COOKIE };

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

const DEFAULT_PREFERENCES: UserPreferences = { locale: "en", currency: "USD" };

// Read-only, cookie-based — safe to call from any Server Component
// (layout, pages) with no database cost. Falls back to en/USD if the
// cookies aren't set yet (brand new browser, or an account that existed
// before this feature shipped).
export async function getServerPreferences(): Promise<UserPreferences> {
  const cookieStore = await cookies();
  const locale = cookieStore.get(LOCALE_COOKIE)?.value;
  const currency = cookieStore.get(CURRENCY_COOKIE)?.value;

  return {
    locale: isLocale(locale) ? locale : DEFAULT_PREFERENCES.locale,
    currency: isCurrency(currency) ? currency : DEFAULT_PREFERENCES.currency,
  };
}

// Called right after establishing a session (Server Actions / Route
// Handlers only — this writes cookies). Looks up whatever's stored for
// this user in Supabase and seeds the cookies with it, so preferences
// follow the account across devices/browsers instead of resetting.
export async function syncPreferencesToCookies(
  supabase: SupabaseServerClient,
  userId: string
): Promise<void> {
  const { data } = await supabase
    .from("user_preferences")
    .select("locale, currency")
    .eq("user_id", userId)
    .maybeSingle();

  if (!data) return;

  const cookieStore = await cookies();
  if (isLocale(data.locale)) {
    cookieStore.set(LOCALE_COOKIE, data.locale, { maxAge: COOKIE_MAX_AGE, path: "/" });
  }
  if (isCurrency(data.currency)) {
    cookieStore.set(CURRENCY_COOKIE, data.currency, { maxAge: COOKIE_MAX_AGE, path: "/" });
  }
}
