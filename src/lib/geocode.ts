// Turns a place name into coordinates using OpenStreetMap's Nominatim
// API — free, no API key or signup, which keeps the map feature in line
// with the rest of the app's "don't cost money" constraints. Usage policy
// (nominatim.org/release-docs/latest/api/Search): max ~1 request/second,
// and a descriptive User-Agent identifying the app is required.

export interface GeocodeResult {
  latitude: number;
  longitude: number;
  displayName: string;
}

interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
}

export async function geocodeLocation(
  query: string
): Promise<GeocodeResult | null> {
  if (!query.trim()) return null;

  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(
    query
  )}`;

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Biyahe-Travel-App/1.0 (personal project)",
        "Accept-Language": "en",
      },
      signal: AbortSignal.timeout(6000),
    });

    if (!res.ok) return null;

    const results = (await res.json()) as NominatimResult[];
    const first = results[0];
    if (!first) return null;

    return {
      latitude: parseFloat(first.lat),
      longitude: parseFloat(first.lon),
      displayName: first.display_name,
    };
  } catch (error) {
    console.error(`Geocoding failed for "${query}":`, error);
    return null;
  }
}
