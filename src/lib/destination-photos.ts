// Shared photo lookup + cache used by both the Discover suggestions API
// (src/app/api/suggest-destinations/route.ts) and the Home page banner
// (src/app/page.tsx) — pulled out so both share one cache-then-fetch
// code path instead of duplicating it.

import { createClient } from "@/lib/supabase-server";
import type { DestinationPhoto } from "@/types";

// Photo strategy: try to fill the whole gallery from Pexels first
// (curated, professional-quality stock photography, free API, no
// mandatory attribution/tracking), and only fall back to Openverse
// (openly-licensed but unmoderated community/photojournalism photos) for
// whatever's left over. Openverse indexes a lot of documentary and press
// photography tagged with place names — stray animals, laborers,
// military personnel, etc. — none of which belong in a travel gallery,
// so it's the fallback, not the default, and both sources get filtered
// through EXCLUDED_KEYWORDS below regardless.
const EXCLUDED_KEYWORDS = [
  "military",
  "navy",
  "army",
  "soldier",
  "war",
  "weapon",
  "gun",
  "medic",
  "medicine",
  "hospital",
  "injury",
  "wound",
  "worker",
  "laborer",
  "labor",
  "labour",
  "factory",
  "industrial",
  "construction",
  "stray",
  "dog",
  "cat",
  "roadkill",
  "dead",
  "accident",
  "crash",
  "protest",
  "riot",
  "funeral",
  "grave",
  "cemetery",
  "crime",
  "police",
  "arrest",
  "prison",
  "refugee",
  "disaster",
  "flood",
  "fire department",
  "poverty",
  "slum",
];

function hasExcludedKeyword(text: string): boolean {
  const lower = text.toLowerCase();
  return EXCLUDED_KEYWORDS.some((keyword) => lower.includes(keyword));
}

interface PexelsPhoto {
  alt: string | null;
  photographer: string;
  photographer_url: string;
  url: string;
  src: { large: string; medium: string };
}

function pexelsCaptionMentions(photo: PexelsPhoto, term: string) {
  return (photo.alt ?? "").toLowerCase().includes(term.toLowerCase());
}

async function fetchPexelsPhotos(
  name: string,
  country: string,
  count: number
): Promise<DestinationPhoto[]> {
  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey || count <= 0) return [];

  const query = encodeURIComponent(`${name} ${country}`);
  const url = `https://api.pexels.com/v1/search?query=${query}&per_page=15&orientation=landscape`;

  try {
    const res = await fetch(url, {
      headers: { Authorization: apiKey },
      signal: AbortSignal.timeout(6000),
    });

    if (!res.ok) {
      console.error(`Pexels search failed for "${name}, ${country}":`, res.status, await res.text());
      return [];
    }

    const data = (await res.json()) as { photos?: PexelsPhoto[] };
    const results = (data.photos ?? []).filter((photo) => !hasExcludedKeyword(photo.alt ?? ""));

    const cityMatches = results.filter((photo) => pexelsCaptionMentions(photo, name));
    const countryOnlyMatches = results.filter(
      (photo) => !pexelsCaptionMentions(photo, name) && pexelsCaptionMentions(photo, country)
    );
    const rest = results.filter(
      (photo) => !pexelsCaptionMentions(photo, name) && !pexelsCaptionMentions(photo, country)
    );

    return [...cityMatches, ...countryOnlyMatches, ...rest].slice(0, count).map((photo) => ({
      url: photo.src.large,
      thumbnailUrl: photo.src.medium,
      creator: photo.photographer,
      creatorUrl: photo.photographer_url,
      sourceUrl: photo.url,
      license: "Pexels",
    }));
  } catch (error) {
    console.error(`Pexels lookup failed for "${name}, ${country}":`, error);
    return [];
  }
}

interface OpenverseImageResult {
  title?: string;
  url: string;
  thumbnail?: string;
  creator?: string;
  creator_url?: string;
  foreign_landing_url?: string;
  license?: string;
  license_version?: string;
}

function titleMentions(item: OpenverseImageResult, term: string) {
  return Boolean(item.url) && (item.title ?? "").toLowerCase().includes(term.toLowerCase());
}

async function fetchOpenversePhotos(
  name: string,
  country: string,
  count: number
): Promise<DestinationPhoto[]> {
  if (count <= 0) return [];

  const query = encodeURIComponent(`${name} ${country}`);
  const url =
    `https://api.openverse.org/v1/images/?q=${query}` +
    // category=photograph excludes illustrations/vector art/digitized
    // documents. size=medium,large filters out tiny, low-quality thumbnails.
    `&category=photograph&size=medium,large` +
    `&page_size=20&mature=false`;

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Biyahe-Travel-App/1.0 (personal project)" },
      signal: AbortSignal.timeout(6000),
    });

    if (!res.ok) return [];

    const data = (await res.json()) as { results?: OpenverseImageResult[] };
    // Openverse's search is keyword/tag matching, not "is this photo
    // actually a scenic shot of this place" verification — it happily
    // returns photojournalism (stray animals, laborers, military
    // personnel, ...) that just happens to be tagged with the place
    // name. Filter those out before anything else.
    const results = (data.results ?? []).filter(
      (item) => !hasExcludedKeyword(item.title ?? "")
    );

    // Only keep results whose own title actually names the city or
    // country, preferring city-name matches — much stronger evidence
    // it's really a photo of the place.
    const cityMatches = results.filter((item) => titleMentions(item, name));
    const countryOnlyMatches = results.filter(
      (item) => !titleMentions(item, name) && titleMentions(item, country)
    );

    return [...cityMatches, ...countryOnlyMatches].slice(0, count).map((item) => ({
      url: item.url,
      thumbnailUrl: item.thumbnail ?? item.url,
      creator: item.creator || "Unknown",
      creatorUrl: item.creator_url,
      sourceUrl: item.foreign_landing_url ?? item.url,
      license: [item.license?.toUpperCase(), item.license_version].filter(Boolean).join(" "),
    }));
  } catch (error) {
    // Photos are a nice-to-have — never fail the whole request over them.
    console.error(`Openverse lookup failed for "${name}, ${country}":`, error);
    return [];
  }
}

const TOTAL_PHOTOS_PER_DESTINATION = 6;

export function destinationCacheKey(name: string, country: string): string {
  return `${name}-${country}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

// Cache-then-fetch: a hit returns instantly with no external API call.
// On a miss, fetches live — Pexels first, Openverse only for whatever
// Pexels didn't fill — and saves the result, so only the first-ever
// lookup for a destination pays that cost; every caller after that
// (Discover, the Home page banner, ...) hits the cache.
export async function getDestinationPhotos(
  supabase: SupabaseServerClient,
  name: string,
  country: string
): Promise<DestinationPhoto[]> {
  const cacheKey = destinationCacheKey(name, country);

  const { data: cached } = await supabase
    .from("destination_photos")
    .select("photos")
    .eq("destination_key", cacheKey)
    .maybeSingle();

  const cachedPhotos = cached?.photos as DestinationPhoto[] | undefined;
  if (cachedPhotos && cachedPhotos.length > 0) {
    return cachedPhotos;
  }

  const pexelsPhotos = await fetchPexelsPhotos(name, country, TOTAL_PHOTOS_PER_DESTINATION);
  const remainingSlots = TOTAL_PHOTOS_PER_DESTINATION - pexelsPhotos.length;
  const openversePhotos = await fetchOpenversePhotos(name, country, remainingSlots);
  const photos = [...pexelsPhotos, ...openversePhotos];

  // Only cache a real result — an empty array would otherwise get stuck
  // there forever and permanently block retries for this destination.
  if (photos.length > 0) {
    const { error: cacheError } = await supabase.from("destination_photos").upsert(
      {
        destination_key: cacheKey,
        name,
        country,
        photos,
        fetched_at: new Date().toISOString(),
      },
      { onConflict: "destination_key" }
    );

    if (cacheError) {
      console.error(`Failed to cache photos for "${name}, ${country}":`, cacheError.message);
    }
  }

  return photos;
}

// A small always-available set used to seed the Home page banner
// (src/app/page.tsx) so it's never empty for a new account with no trips
// or Discover searches yet. Runs through the exact same cache-then-fetch
// path above, so the very first Home page load fetches these live and
// caches them — every load after that is instant.
export const FEATURED_DESTINATIONS: { name: string; country: string }[] = [
  { name: "Paris", country: "France" },
  { name: "Santorini", country: "Greece" },
  { name: "Kyoto", country: "Japan" },
  { name: "Bali", country: "Indonesia" },
  { name: "New York City", country: "United States" },
  { name: "Machu Picchu", country: "Peru" },
  { name: "Dubai", country: "United Arab Emirates" },
  { name: "Rome", country: "Italy" },
  { name: "Cape Town", country: "South Africa" },
  { name: "Bangkok", country: "Thailand" },
];
