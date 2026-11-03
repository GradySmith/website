"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase-server";
import { isLocale, type Locale } from "@/lib/i18n";
import {
  isCurrency,
  type Currency,
  LOCALE_COOKIE,
  CURRENCY_COOKIE,
} from "@/lib/preferences-shared";

const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

type ActionResult = { success: true } | { success: false; error: string };

// Called from the TopBar language/currency dropdowns. Writes the cookies
// immediately (so this browser reflects the change on the very next
// render) and, if signed in, upserts the same value into Supabase so it
// follows the account to other devices.
export async function updatePreferences({
  locale,
  currency,
}: {
  locale?: Locale;
  currency?: Currency;
}): Promise<ActionResult> {
  if (locale !== undefined && !isLocale(locale)) {
    return { success: false, error: "Invalid language." };
  }
  if (currency !== undefined && !isCurrency(currency)) {
    return { success: false, error: "Invalid currency." };
  }
  if (locale === undefined && currency === undefined) {
    return { success: false, error: "Nothing to update." };
  }

  const cookieStore = await cookies();
  if (locale) {
    cookieStore.set(LOCALE_COOKIE, locale, { maxAge: COOKIE_MAX_AGE, path: "/" });
  }
  if (currency) {
    cookieStore.set(CURRENCY_COOKIE, currency, { maxAge: COOKIE_MAX_AGE, path: "/" });
  }

  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getClaims();
  const userId = authData?.claims?.sub as string | undefined;

  if (userId) {
    const { error } = await supabase.from("user_preferences").upsert(
      {
        user_id: userId,
        ...(locale ? { locale } : {}),
        ...(currency ? { currency } : {}),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

    if (error) {
      console.error("Failed to save preferences:", error.message);
    }
  }

  revalidatePath("/", "layout");
  return { success: true };
}
