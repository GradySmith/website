# Biyahe

"A trip you will remember." Travel planning app: destination discovery, trip
management, bookings, calendar, and budget tracking — built with Next.js,
Tailwind CSS, and Supabase.

## Stack

- **Next.js 16** (App Router, TypeScript)
- **Tailwind CSS v4** (CSS-first theme, see `src/app/globals.css`)
- **Supabase** for auth, database, and storage
- **Claude API** for AI-generated destination suggestions

## Getting started

Requires Node.js 20+.

```bash
npm install
cp .env.local.example .env.local
# fill in the Supabase and Anthropic keys in .env.local (see below)
npm run dev
```

Then open http://localhost:3000.

## Database setup

Schema lives in `supabase/migrations/`, applied in order:

- `0001_init.sql` — `trips`, `bookings`, `budget_lines` tables, indexes, and
  Row Level Security so each user only sees their own data (bookings and
  budget lines are scoped through their parent trip's `user_id`).
- `0002_trip_details.sql` — adds `title`/`status`/`description`/budget
  columns to `trips`, plus the `itinerary_items` table (used by the trip
  tabs and the Route Map page).
- `0003_email_sync.sql` — `email_connections` (stores the Gmail OAuth
  tokens) and `detected_bookings` (staged bookings found by a Gmail scan,
  pending review) — see "Gmail booking sync" below.
- `0004_destination_photo_cache.sql` — `destination_photos`, a shared
  cache of each suggested destination's photo gallery — see "Discover
  photos" below.
- `0005_user_preferences.sql` — `user_preferences` (one row per user:
  `locale`, `currency`) — see "Language and currency preferences" below.
- `0006_itinerary_item_type.sql` — adds `item_type` (`'activity'` or
  `'accommodation'`, defaults to `'activity'`) to `itinerary_items`, so the
  trip Map tab can show a Home icon for accommodation nights and a flag
  icon for planned activities.

To apply any of these: open your project in the Supabase dashboard →
**SQL Editor** → **New query**, paste the file's contents, and click
**Run**. (Once you're comfortable with the Supabase CLI, `supabase db push`
will apply migrations from this folder directly instead.)

`src/types/index.ts` mirrors these tables' column names exactly (snake_case)
since that's what `supabase-js` returns from queries — no mapping layer.

## Environment variables

Copy `.env.local.example` to `.env.local` and fill in:

- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — from
  a free project at [supabase.com](https://supabase.com) (Settings → API
  Keys → **Publishable key**, the current name for what used to be called
  the "anon key").
- `ANTHROPIC_API_KEY` — from [console.anthropic.com](https://console.anthropic.com),
  used by `src/app/api/suggest-destinations/route.ts` to generate real
  destination suggestions on the Discover page.
- `PEXELS_API_KEY` — see "Discover photos" below.
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — see "Gmail booking sync"
  below.

### Discover destinations are open-ended

Claude can suggest any real destination that fits the traveler's stated
interests, region, travel style, duration, month, and budget — `buildPrompt()`
in `src/app/api/suggest-destinations/route.ts` doesn't constrain it to a
fixed list. (`src/data/curated-destinations.ts` exists from a brief
experiment constraining suggestions to ~36 hand-picked destinations; it's
unused now but left in place — see the comment at the top of that file if
revisiting that trade-off.)

### Discover photos

Each destination's photo gallery blends two sources, cached so repeat
lookups for the same place skip both — all handled by the shared
`getDestinationPhotos()` in `src/lib/destination-photos.ts` (used by the
Discover page, the Home page banner, and Popular itineraries alike):

- **`destination_photos` cache (Supabase)** is checked first, keyed by
  destination name + country. A hit returns instantly with no external API
  call at all.
- On a cache **miss**, it fetches live and then saves the result:
  **Pexels** (`fetchPexelsPhotos`) tries to fill the entire gallery first —
  curated, professional-quality stock photography, free API, 200
  requests/hour, no attribution/tracking-ping requirement. **Openverse**
  (`fetchOpenversePhotos`) only fills whatever's left — openly-licensed
  community photos, no API key or rate limit, more variable quality since
  it's user-submitted rather than curated.
- Both sources are filtered through `EXCLUDED_KEYWORDS` (military, medical,
  labor, stray animals, disaster, crime, etc.) before anything is shown or
  cached, since Openverse in particular is unmoderated and can otherwise
  surface photojournalism that happens to match on place-name text but has
  nothing to do with tourism.

Setup, Pexels only (Openverse and the cache need nothing extra):

1. Go to [pexels.com/api](https://www.pexels.com/api/) → sign up / log in →
   your API key is generated immediately, no app review.
2. Copy it into `.env.local` as `PEXELS_API_KEY`.

If `PEXELS_API_KEY` is unset, a cache miss just falls back to all-Openverse
— nothing breaks, photos just skew lower quality until the key's added. To
change the total gallery size, adjust `TOTAL_PHOTOS_PER_DESTINATION` in
`src/lib/destination-photos.ts`. To force a re-fetch for a destination
(e.g. its cached photos turned out mismatched), delete its row from
`destination_photos` in the Supabase dashboard — the next search for it
will repopulate the cache.

## Auth

Email/password auth is wired up end to end using `@supabase/ssr`:

- `src/proxy.ts` + `src/lib/supabase-proxy.ts` — refreshes the session on
  every request and redirects signed-out users to `/login` for any route
  other than `/login` or `/auth/*`.
- `src/app/login/page.tsx` + `actions.ts` — sign in / create account form,
  backed by Server Actions (`signIn`, `signUp`, `signOut`).
- `src/app/layout.tsx` — reads the `x-pathname` header proxy.ts sets to
  decide whether to show the Sidebar (hidden on `/login`), and fetches the
  current user's email server-side to display in the Sidebar.

**Before testing sign-up**, go to your Supabase project → **Authentication**
→ **Sign In / Providers** → **Email**, and turn **off** "Confirm email".
With it on, `signUp()` won't return an active session until the user clicks
a confirmation link, and this project doesn't have that email-confirmation
route built yet. Turning it off means creating an account logs you in
immediately — good for development. Re-enable it (and add a proper
`/auth/confirm` route handler, plus a matching email template in the
Supabase dashboard) before this goes anywhere near real users.

### Google sign-in

`signInWithGoogle` (in `src/app/login/actions.ts`) and
`src/app/auth/callback/route.ts` are wired up for Google OAuth (PKCE code
exchange). Before it'll work, do this manual setup — code alone can't do
it, since it requires creating credentials in Google's console:

1. In the [Google Auth Platform console](https://console.cloud.google.com/auth/clients),
   create an OAuth client → **Web application**.
2. Under **Authorized JavaScript origins**, add `http://localhost:3000`
   (and your real domain once deployed).
3. Under **Authorized redirect URIs**, add your Supabase project's callback
   URL — for this project, that's
   `https://dwbferdrysqfrfolqyey.supabase.co/auth/v1/callback` (double-check
   the exact value on the [Google provider page](https://supabase.com/dashboard/project/_/auth/providers?provider=Google)
   in your Supabase dashboard).
4. Copy the generated **Client ID** and **Client Secret**.
5. In Supabase: **Authentication → Sign In / Providers → Google**, toggle it
   on, paste in the Client ID and Client Secret, and save.
6. Make sure `NEXT_PUBLIC_SITE_URL` in `.env.local` is `http://localhost:3000`
   for local dev (already set).

### Gmail booking sync

The Bookings page (`/bookings`) can scan the last 90 days of your Gmail
inbox for flight/hotel/car/activity confirmations, extract the details with
Claude, and let you review each one before adding it to a trip (creating a
new trip if none fits). This reuses the same Google OAuth client from
"Google sign-in" above, but needs two more things:

1. **Enable the Gmail API** for your Google Cloud project: [APIs & Services → Library](https://console.cloud.google.com/apis/library/gmail.googleapis.com) → **Enable**.
2. **Add the Gmail scope to your OAuth consent screen**: [Google Auth Platform → Data Access](https://console.cloud.google.com/auth/scopes) → **Add or remove scopes** → add
   `.../auth/gmail.readonly` → **Update**. If your app is in **Testing**
   publishing status (the default, fine for personal use), also add your own
   Google account under **Test users** or the consent screen will reject it.
3. Add the same OAuth client's **Client ID** and **Client Secret** (from step
   4 of the Google sign-in setup above) to `.env.local` as `GOOGLE_CLIENT_ID`
   and `GOOGLE_CLIENT_SECRET`. These are separate from the values pasted into
   Supabase's provider settings — Supabase needs them to run its own OAuth
   flow, and the app needs them again here to refresh a Gmail-scoped access
   token server-side (`src/lib/gmail.ts`).
4. Run `supabase/migrations/0003_email_sync.sql` (see Database setup above).

Then on `/bookings`, click **Connect Gmail** — since this requests a new
scope beyond basic sign-in, Google will show the consent screen again even
if you're already signed in. Click **Scan last 90 days** any time after
that; each scan only sends new messages (not already scanned) through
Claude, so repeat scans stay cheap. Nothing is added to a trip until you
review and click **Confirm & add** on a detected booking.

Only Gmail is wired up right now — Outlook (Microsoft Graph API, `Mail.Read`
scope via Azure App Registration) would follow the same shape but isn't
built.

## Language and currency preferences

The top-right corner of the app (`src/components/TopBar.tsx`) has a
language switcher (English/French) and a currency switcher (USD/CAD).
Scope is deliberately narrow — **navigation labels and page headings only**,
not full UI translation, and **currency conversion is display-only**:
everything is stored in USD in the database, and the selected currency just
changes how numbers are formatted on screen.

- `src/lib/i18n.ts` — the translation dictionary (`t(locale, key)`) and the
  `TranslationKey` union it covers (nav labels, headings, sign out).
  Nothing outside that list gets translated — form fields, AI-generated
  destination copy, empty-state text, etc. all stay English.
- `src/lib/currency-format.ts` — `formatCurrency()` for numeric amounts and
  `convertMoneyString()` for free-text ranges like Discover's AI-generated
  `"$1,200-1,800"` budget estimates.
- `src/lib/exchange-rate.ts` — `getUsdToCadRate()`, a free/keyless USD→CAD
  rate from [Frankfurter](https://frankfurter.dev) (ECB-backed), cached for
  an hour via Next's fetch cache, with a static fallback rate if the
  request fails.
- `src/lib/preferences.ts` — `getServerPreferences()` reads the active
  locale/currency from cookies (`biyahe_locale`/`biyahe_currency`) so
  Server Components can use them on every render with no DB round trip.
  `syncPreferencesToCookies()` seeds those cookies from the
  `user_preferences` Supabase row right after sign-in, so a returning user
  on a new device/browser gets their saved preference back.
- `src/app/actions/preferences.ts` — `updatePreferences()`, the Server
  Action the TopBar calls on every change: writes both cookies and upserts
  the `user_preferences` row.
- `src/lib/preferences-context.tsx` — `PreferencesProvider`/`usePreferences()`,
  the Client Context that Client Components (TopBar, Sidebar, DestinationCard,
  Budget page, ...) read from, with optimistic local updates so a change
  reflects immediately rather than waiting on the Server Action round trip.

No new env vars are needed for this feature — Frankfurter doesn't require a
key, and everything else is Supabase/cookies you already have configured.

## Project structure

```
src/
  proxy.ts                   Session refresh + auth gate (Next 16's middleware.ts)
  app/
    layout.tsx                Root layout: conditional sidebar + page content
    page.tsx                  Home
    globals.css                Tailwind v4 theme (brand colors, fonts)
    login/
      page.tsx                 Sign in / create account / Google form
      actions.ts                signIn, signUp, signInWithGoogle, signOut Server Actions
    auth/callback/route.ts     OAuth (Google) PKCE code exchange + Gmail token capture
    discover/page.tsx          Destination quiz -> Claude-generated suggestions w/ photos
    trips/
      page.tsx                  My Trips (real data) + Create Trip modal
      actions.ts                 saveTrip, createTrip, deleteTrip, updateTripBudget, itinerary CRUD
      [id]/layout.tsx              Shared header (cover/dates/status) + tab nav for one trip
      [id]/page.tsx                 Overview tab: details, flights, quick stats
      [id]/itinerary/page.tsx       Itinerary tab: day-by-day builder (old [id]/page.tsx content)
      [id]/budget/page.tsx          Budget tab: same breakdown as /budget, scoped to this trip
      [id]/map/page.tsx             Map tab: embedded RouteMap, Home/flag markers by item_type
    map/page.tsx                Route Map (top-level, trip selector, Leaflet + OpenStreetMap)
    bookings/
      page.tsx                    Bookings: Gmail sync panel, detected-booking review, confirmed list
      actions.ts                   connectGmail, scanGmailForBookings, confirm/dismissDetectedBooking
    calendar/page.tsx           Calendar (placeholder)
    budget/page.tsx             Budget: per-trip cost breakdown, editable budget fields, currency-aware display
    error.tsx                   App Router error boundary (shows a real message instead of a blank page)
    actions/preferences.ts      updatePreferences Server Action (locale/currency)
    api/
      suggest-destinations/route.ts   Claude API — destination suggestions, pronunciation, cached photos
  components/
    Sidebar.tsx, Logo.tsx, PillButton.tsx, FeatureCard.tsx, EmptyState.tsx,
    CreateTripModal.tsx, TripStatusBadge.tsx, AddItineraryItemForm.tsx,
    RouteMap.tsx, RouteMapLoader.tsx (Leaflet, dynamic ssr:false),
    GmailSyncPanel.tsx, DetectedBookingCard.tsx, DestinationCard.tsx,
    DestinationBanner.tsx (Home page scrolling photo banner),
    LoadingHummingbird.tsx (Discover loading indicator), TopBar.tsx,
    PopularItinerariesCarousel.tsx (3-card rotating banner on Discover),
    TripTabs.tsx (Overview/Itinerary/Budget/Map tab nav for one trip),
    TripBudgetPanel.tsx (shared editable breakdown — /budget and the Budget tab)
  data/
    popular-itineraries.ts     Hand-written "Popular itineraries" cards on Discover
    curated-destinations.ts    Unused — left from a reverted experiment, see comment at top
  lib/
    supabase.ts               Browser Supabase client
    supabase-server.ts         Server Supabase client (Server Components/Actions)
    supabase-proxy.ts          Session-refresh helper used by src/proxy.ts
    geocode.ts                 Nominatim geocoding (free, no key)
    gmail.ts                   Gmail REST API: token refresh, search, message parsing
    destination-photos.ts      Shared photo cache-then-fetch (Pexels + Openverse)
    get-trip.ts                React cache()-wrapped trip lookup, shared by the [id] layout + tabs
    i18n.ts                    Translation dictionary (nav + headings only)
    preferences.ts             Server-only: getServerPreferences, syncPreferencesToCookies (next/headers)
    preferences-shared.ts      Client-safe: Currency/Locale types, CURRENCIES, cookie names
    preferences-context.tsx    Client Context for locale/currency (usePreferences)
    currency-format.ts         formatCurrency / convertMoneyString (USD -> CAD display)
    exchange-rate.ts           getUsdToCadRate (Frankfurter API, cached)
  types/
    index.ts                   Shared types (Trip, Booking, ItineraryItem, DetectedBooking, ...)
```

## Design system

Colors, fonts, and spacing are defined in `src/app/globals.css` under
`@theme`, sampled from the original Biyahe draft: teal/mint gradient hero,
Fraunces for display type, Inter for body text. Adjust the `--color-brand-*`
tokens there to retune the palette globally.

## Next steps

1. ✅ `npm install` locally, confirmed `npm run dev` matches the design draft.
2. ✅ Supabase project created and connected via `.env.local`.
3. ✅ `supabase/migrations/0001_init.sql` run in the SQL Editor — `trips`,
   `bookings`, and `budget_lines` tables exist with RLS.
4. ✅ Email/password auth wired up (`/login`, Server Actions, proxy-based
   gating). Turn off "Confirm email" in Supabase Auth settings before
   testing sign-up — see the Auth section above.
5. ✅ Claude API wired up — `suggest-destinations` uses `claude-sonnet-5`
   with a forced tool call to return structured destination suggestions,
   rendered as cards on the Discover page.
6. ✅ Discover destination cards have a "Save this trip" button
   (`src/app/trips/actions.ts` → `saveTrip`) that inserts into `trips` for
   the signed-in user. My Trips (`src/app/trips/page.tsx`) lists saved
   trips for real from Supabase, with a Remove button per trip
   (`deleteTrip`).
7. ✅ Trip tabs (`/trips/[id]`) — Overview, Itinerary, Budget, and Map as
   four tabs sharing one header (`src/app/trips/[id]/layout.tsx` +
   `TripTabs.tsx`), plus a top-level Route Map page (`/map`, sidebar) with
   its own trip selector. Itinerary items geocode their location
   (Nominatim, free) and the Map tab plots them with Leaflet/OpenStreetMap,
   using a Home icon for accommodation and a flag icon for activities
   (`item_type` column, migration `0006`).
8. ✅ Budget page (`/budget`) and the trip's Budget tab (`/trips/[id]/budget`)
   — per-trip cost breakdown (flights, visa, accommodation, activities,
   food, beverages, splurge), editable fields saved via `updateTripBudget`.
   Both share the same `TripBudgetPanel` component.
9. ✅ Gmail booking sync (`/bookings`) — connect Gmail, scan the last 90
   days for booking confirmations, review Claude-extracted details, and
   confirm into a trip (existing or new). See "Gmail booking sync" above
   for the one-time Google Cloud setup this needs.
10. Calendar is still a placeholder — same pattern as the other pages
    (Server Component reads from Supabase, Server Actions for writes)
    would extend to it once bookings/itinerary items have enough date
    coverage to plot.
11. ✅ Language (English/French) and currency (USD/CAD) preferences — TopBar
    switcher, persisted per-account in Supabase and synced to cookies on
    sign-in. See "Language and currency preferences" above.
12. Deploy to Vercel (`vercel deploy`), adding the same env vars there —
    including `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` if Gmail sync is in
    use, and updating the Google Cloud OAuth client's authorized origins/
    redirect URIs to the real domain.
