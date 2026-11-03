"use client";

// Client-side access to language/currency preferences, so components can
// read and change them without prop-drilling through every layout. The
// Server-rendered layout fetches the starting values (cookies +
// getUsdToCadRate()) and passes them in here as initial state; from then
// on, changes go through updatePreferences (writes cookies + Supabase)
// and update local state optimistically so the UI reacts immediately.

import { createContext, useContext, useState, useTransition, type ReactNode } from "react";
import type { Locale } from "@/lib/i18n";
import type { Currency } from "@/lib/preferences-shared";
import { updatePreferences } from "@/app/actions/preferences";

interface PreferencesContextValue {
  locale: Locale;
  currency: Currency;
  exchangeRate: number; // USD -> CAD
  isPending: boolean;
  setLocale: (locale: Locale) => void;
  setCurrency: (currency: Currency) => void;
}

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

export function PreferencesProvider({
  initialLocale,
  initialCurrency,
  exchangeRate,
  children,
}: {
  initialLocale: Locale;
  initialCurrency: Currency;
  exchangeRate: number;
  children: ReactNode;
}) {
  const [locale, setLocaleState] = useState(initialLocale);
  const [currency, setCurrencyState] = useState(initialCurrency);
  const [isPending, startTransition] = useTransition();

  function setLocale(next: Locale) {
    if (next === locale) return;
    setLocaleState(next);
    startTransition(async () => {
      const result = await updatePreferences({ locale: next });
      if (!result.success) {
        // Revert on failure — better than silently pretending it saved.
        setLocaleState(locale);
      }
    });
  }

  function setCurrency(next: Currency) {
    if (next === currency) return;
    setCurrencyState(next);
    startTransition(async () => {
      const result = await updatePreferences({ currency: next });
      if (!result.success) {
        setCurrencyState(currency);
      }
    });
  }

  return (
    <PreferencesContext.Provider
      value={{ locale, currency, exchangeRate, isPending, setLocale, setCurrency }}
    >
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences(): PreferencesContextValue {
  const ctx = useContext(PreferencesContext);
  if (!ctx) {
    throw new Error("usePreferences must be used within a PreferencesProvider");
  }
  return ctx;
}
