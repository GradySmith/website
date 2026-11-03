// Lightweight translation dictionary — deliberately scoped to navigation
// labels and page headings only (not full UI copy, AI-generated content,
// or form labels). Server Components read the active locale via
// getServerLocale() (src/lib/preferences.ts); Client Components read it
// from PreferencesContext (src/lib/preferences-context.tsx) — both call
// this same t() function so translations stay in one place.

export type Locale = "en" | "fr";

export const LOCALES: { value: Locale; label: string }[] = [
  { value: "en", label: "English" },
  { value: "fr", label: "Français" },
];

type TranslationKey =
  | "nav_home"
  | "nav_discover"
  | "nav_trips"
  | "nav_map"
  | "nav_bookings"
  | "nav_calendar"
  | "nav_budget"
  | "sign_out"
  | "home_tagline"
  | "home_features_heading"
  | "discover_heading"
  | "discover_popular_heading"
  | "discover_popular_subheading"
  | "trips_heading"
  | "trips_subheading"
  | "bookings_heading"
  | "bookings_subheading"
  | "calendar_heading"
  | "budget_heading"
  | "map_heading";

const TRANSLATIONS: Record<Locale, Record<TranslationKey, string>> = {
  en: {
    nav_home: "Home",
    nav_discover: "Discover",
    nav_trips: "My Trips",
    nav_map: "Route Map",
    nav_bookings: "Bookings",
    nav_calendar: "Calendar",
    nav_budget: "Budget",
    sign_out: "Sign out",
    home_tagline: "A trip you will remember.",
    home_features_heading: "Everything you need for your journey",
    discover_heading: "Where should you go next?",
    discover_popular_heading: "Popular itineraries",
    discover_popular_subheading:
      "Not sure where to start? These are crowd favorites for a reason — skip the form and plan one of these instead.",
    trips_heading: "Your itineraries",
    trips_subheading: "Trips you're dreaming up or committed to.",
    bookings_heading: "Bookings",
    bookings_subheading:
      "Flights, hotels, and activities you've booked for a trip — one place for every confirmation number.",
    calendar_heading: "Calendar",
    budget_heading: "Budget",
    map_heading: "Route Map",
  },
  fr: {
    nav_home: "Accueil",
    nav_discover: "Découvrir",
    nav_trips: "Mes voyages",
    nav_map: "Carte de l'itinéraire",
    nav_bookings: "Réservations",
    nav_calendar: "Calendrier",
    nav_budget: "Budget",
    sign_out: "Déconnexion",
    home_tagline: "Un voyage dont vous vous souviendrez.",
    home_features_heading: "Tout ce qu'il vous faut pour votre voyage",
    discover_heading: "Où partir la prochaine fois ?",
    discover_popular_heading: "Itinéraires populaires",
    discover_popular_subheading:
      "Pas sûr par où commencer ? Voici des favoris incontournables — planifiez-en un sans passer par le formulaire.",
    trips_heading: "Vos itinéraires",
    trips_subheading: "Les voyages que vous imaginez ou avez déjà confirmés.",
    bookings_heading: "Réservations",
    bookings_subheading:
      "Vols, hébergements et activités réservés pour un voyage — regroupés au même endroit avec chaque numéro de confirmation.",
    calendar_heading: "Calendrier",
    budget_heading: "Budget",
    map_heading: "Carte de l'itinéraire",
  },
};

export function t(locale: Locale, key: TranslationKey): string {
  return TRANSLATIONS[locale]?.[key] ?? TRANSLATIONS.en[key];
}

export function isLocale(value: string | undefined | null): value is Locale {
  return value === "en" || value === "fr";
}
