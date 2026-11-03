"use client";

// Top-right language + currency switcher. Lives inside PreferencesProvider
// (wired in layout.tsx) so any change here updates the Sidebar's
// translated labels and any currency-formatted numbers across the app
// immediately, then persists in the background via updatePreferences.

import { usePreferences } from "@/lib/preferences-context";
import { LOCALES } from "@/lib/i18n";
import { CURRENCIES } from "@/lib/preferences-shared";

export function TopBar() {
  const { locale, currency, setLocale, setCurrency, isPending } = usePreferences();

  return (
    <div className="flex items-center gap-2 text-xs font-medium">
      <div className="flex overflow-hidden rounded-full border border-brand-teal-100 bg-white">
        {LOCALES.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            title={label}
            aria-pressed={locale === value}
            disabled={isPending}
            onClick={() => setLocale(value)}
            className={`px-3 py-1.5 transition-colors disabled:cursor-wait ${
              locale === value
                ? "bg-brand-teal-700 text-white"
                : "text-brand-muted hover:bg-brand-teal-50"
            }`}
          >
            {value.toUpperCase()}
          </button>
        ))}
      </div>
      <div className="flex overflow-hidden rounded-full border border-brand-teal-100 bg-white">
        {CURRENCIES.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            title={label}
            aria-pressed={currency === value}
            disabled={isPending}
            onClick={() => setCurrency(value)}
            className={`px-3 py-1.5 transition-colors disabled:cursor-wait ${
              currency === value
                ? "bg-brand-teal-700 text-white"
                : "text-brand-muted hover:bg-brand-teal-50"
            }`}
          >
            {value}
          </button>
        ))}
      </div>
    </div>
  );
}
