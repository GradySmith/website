// USD -> CAD exchange rate for currency display conversion (Budget page,
// Discover cost estimates, ...). Everything is stored in USD — this only
// affects what's shown on screen when the currency preference is CAD.
//
// Frankfurter (https://frankfurter.dev) is a free, keyless FX API backed
// by the European Central Bank's daily reference rates — no signup, no
// rate limit worth worrying about at this app's scale.

const FRANKFURTER_URL = "https://api.frankfurter.dev/v1/latest?base=USD&symbols=CAD";

// Used only if the live fetch fails — a reasonable long-run approximation
// so currency conversion still works (just slightly stale) rather than
// breaking outright.
const FALLBACK_USD_TO_CAD = 1.37;

export async function getUsdToCadRate(): Promise<number> {
  try {
    const res = await fetch(FRANKFURTER_URL, {
      // Exchange rates don't need to be second-fresh for this app —
      // cache for an hour so most requests don't hit the network at all.
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) return FALLBACK_USD_TO_CAD;

    const data = (await res.json()) as { rates?: { CAD?: number } };
    return data.rates?.CAD ?? FALLBACK_USD_TO_CAD;
  } catch (error) {
    console.error("Exchange rate lookup failed, using fallback rate:", error);
    return FALLBACK_USD_TO_CAD;
  }
}

// Looks up how many USD one unit of `currencyCode` is worth right now —
// used when a Gmail-scanned booking's cost was stated in a local currency
// (e.g. a Hungarian airline charging in HUF) so it can be converted to USD
// before being stored, since every other part of the app assumes a
// booking's stored cost is already in USD. Returns null (rather than a
// guessed 1:1 rate) if the code is unrecognized or the lookup fails, so
// callers can leave the cost unset instead of silently mislabeling a
// foreign amount as USD.
export async function getUsdRateForCurrency(currencyCode: string): Promise<number | null> {
  const code = currencyCode?.trim().toUpperCase();
  if (!code) return null;
  if (code === "USD") return 1;

  try {
    const url = `https://api.frankfurter.dev/v1/latest?base=${encodeURIComponent(code)}&symbols=USD`;
    const res = await fetch(url, {
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) return null;

    const data = (await res.json()) as { rates?: { USD?: number } };
    return data.rates?.USD ?? null;
  } catch (error) {
    console.error(`Exchange rate lookup failed for ${code} -> USD:`, error);
    return null;
  }
}
