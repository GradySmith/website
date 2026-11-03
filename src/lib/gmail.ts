// Minimal Gmail API client — just enough to search a user's inbox for
// likely booking confirmation emails and pull out their text content.
// No SDK dependency, just fetch() against the REST API (free, generous
// quota, no billing required for this volume of calls).

const GMAIL_API_BASE = "https://gmail.googleapis.com/gmail/v1/users/me";

// Airline/hotel/OTA domains worth trusting as a sender-based signal.
// Combined with subject-line keywords below to keep the search tight —
// this runs BEFORE anything reaches Claude, so it's what keeps scan
// cost down.
const AIRLINE_DOMAINS = [
  // North America
  "united.com",
  "delta.com",
  "aa.com",
  "southwest.com",
  "jetblue.com",
  "alaskaair.com",
  "spirit.com",
  "flyfrontier.com",
  "allegiantair.com",
  "aircanada.com",
  "westjet.com",
  // Europe
  "britishairways.com",
  "lufthansa.com",
  "airfrance.com",
  "klm.com",
  "ryanair.com",
  "easyjet.com",
  "wizzair.com",
  "iberia.com",
  "flytap.com",
  "finnair.com",
  "flysas.com",
  "norwegian.com",
  "vueling.com",
  "swiss.com",
  "austrian.com",
  "aerlingus.com",
  "turkishairlines.com",
  "virginatlantic.com",
  // Asia-Pacific
  "philippineairlines.com",
  "cebupacificair.com",
  "singaporeair.com",
  "cathaypacific.com",
  "ana.co.jp",
  "jal.co.jp",
  "qantas.com",
  "virginaustralia.com",
  "airnewzealand.co.nz",
  "airindia.com",
  "indigo.in",
  "thaiairways.com",
  "vietnamairlines.com",
  "koreanair.com",
  "flyasiana.com",
  // Middle East / Africa
  "emirates.com",
  "qatarairways.com",
  "etihad.com",
  "flysaa.com",
  // Latin America
  "latam.com",
  "avianca.com",
  "copaair.com",
  "aeromexico.com",
  "gol.com.br",
  "azul.com.br",
];

const HOTEL_DOMAINS = [
  "airbnb.com",
  "booking.com",
  "hotels.com",
  "vrbo.com",
  "agoda.com",
  "marriott.com",
  "hilton.com",
  "hyatt.com",
  "ihg.com",
  "hostelworld.com",
  "hostelbookers.com",
];

// These OTAs sell both flights and hotels, so they're relevant to either
// a flight-only or hotel-only scan, not just an "all" one.
const OTA_DOMAINS = [
  "expedia.com",
  "kayak.com",
  "priceline.com",
  "orbitz.com",
  "travelocity.com",
  "cheapoair.com",
  "skyscanner.com",
];

const BOOKING_SENDER_DOMAINS = [...AIRLINE_DOMAINS, ...HOTEL_DOMAINS, ...OTA_DOMAINS];

const SHARED_SUBJECT_KEYWORDS = ["confirmation", "itinerary", "booking", "reservation", "your trip"];
const FLIGHT_SUBJECT_KEYWORDS = [
  "e-ticket",
  "eticket",
  "electronic ticket",
  "boarding pass",
  "flight confirmation",
  "flight itinerary",
  "flight receipt",
  "flight booking",
  "your flight",
  "trip confirmation",
  "check-in",
  "booking reference",
  "PNR",
];
const HOTEL_SUBJECT_KEYWORDS = ["your stay", "hotel confirmation", "check-in"];

const BOOKING_SUBJECT_KEYWORDS = [
  ...SHARED_SUBJECT_KEYWORDS,
  ...FLIGHT_SUBJECT_KEYWORDS,
  ...HOTEL_SUBJECT_KEYWORDS,
];

// Lets a scan be narrowed to just flights or just hotels — used by the
// "custom scan" option on the Bookings page, which also lets the user
// pick a specific lookback window instead of the fixed default.
export type BookingSearchType = "all" | "flight" | "hotel";

function sendersForType(type: BookingSearchType): string[] {
  if (type === "flight") return [...AIRLINE_DOMAINS, ...OTA_DOMAINS];
  if (type === "hotel") return [...HOTEL_DOMAINS, ...OTA_DOMAINS];
  return BOOKING_SENDER_DOMAINS;
}

function subjectKeywordsForType(type: BookingSearchType): string[] {
  if (type === "flight") return [...SHARED_SUBJECT_KEYWORDS, ...FLIGHT_SUBJECT_KEYWORDS];
  if (type === "hotel") return [...SHARED_SUBJECT_KEYWORDS, ...HOTEL_SUBJECT_KEYWORDS];
  return BOOKING_SUBJECT_KEYWORDS;
}

export function buildBookingSearchQuery(
  sinceDays: number,
  type: BookingSearchType = "all"
): string {
  const fromClause = sendersForType(type)
    .map((domain) => `from:${domain}`)
    .join(" OR ");
  const subjectClause = subjectKeywordsForType(type)
    .map((keyword) => `subject:"${keyword}"`)
    .join(" OR ");

  return `newer_than:${sinceDays}d ((${fromClause}) OR (${subjectClause}))`;
}

export async function refreshGoogleAccessToken(
  refreshToken: string
): Promise<string | null> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error(
      "GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET are not set — can't refresh Gmail access token."
    );
    return null;
  }

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) {
    console.error("Gmail token refresh failed:", await res.text());
    return null;
  }

  const data = (await res.json()) as { access_token?: string };
  return data.access_token ?? null;
}

interface GmailMessageRef {
  id: string;
  threadId: string;
}

export async function searchBookingMessages(
  accessToken: string,
  sinceDays = 90,
  maxResults = 25,
  type: BookingSearchType = "all"
): Promise<GmailMessageRef[]> {
  const query = buildBookingSearchQuery(sinceDays, type);
  const url = `${GMAIL_API_BASE}/messages?q=${encodeURIComponent(query)}&maxResults=${maxResults}`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    console.error("Gmail message search failed:", await res.text());
    return [];
  }

  const data = (await res.json()) as { messages?: GmailMessageRef[] };
  return data.messages ?? [];
}

interface GmailMessagePart {
  mimeType?: string;
  body?: { data?: string };
  parts?: GmailMessagePart[];
}

interface GmailMessage {
  id: string;
  payload?: {
    headers?: { name: string; value: string }[];
    mimeType?: string;
    body?: { data?: string };
    parts?: GmailMessagePart[];
  };
}

function decodeBase64Url(data: string): string {
  return Buffer.from(data, "base64url").toString("utf-8");
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Gmail messages can be a single body or a nested tree of MIME parts —
// walk the whole tree and collect BOTH the plain-text and HTML parts if
// present (most confirmation emails are multipart/alternative with one of
// each). Plain text is what Claude reads; the raw HTML is kept around
// separately so it can be checked for schema.org booking markup, which
// only ever appears in the HTML part.
function extractBody(part?: GmailMessagePart): { text: string | null; html: string | null } {
  if (!part) return { text: null, html: null };

  let text: string | null = null;
  let html: string | null = null;

  if (part.mimeType === "text/plain" && part.body?.data) {
    text = decodeBase64Url(part.body.data);
  } else if (part.mimeType === "text/html" && part.body?.data) {
    html = decodeBase64Url(part.body.data);
  }

  if (part.parts) {
    for (const child of part.parts) {
      const result = extractBody(child);
      text = text ?? result.text;
      html = html ?? result.html;
      if (text && html) break;
    }
  }

  return { text, html };
}

// Many airlines (and OTAs like Expedia/Kayak) embed schema.org
// FlightReservation markup in their confirmation emails' HTML — it's what
// lets Gmail/Google Calendar/Apple Mail auto-detect a flight and offer to
// add it to your calendar. Gmail doesn't expose a search operator for it
// (so it can't help narrow the initial inbox search), but since we
// already download the full email body for anything that matches the
// search, checking for it here is a free, high-confidence signal that an
// email is a real flight booking — used to steer Claude's classification.
function looksLikeStructuredFlightData(html: string | null, bodyText: string): boolean {
  if (html && /schema\.org\/FlightReservation/i.test(html)) return true;
  if (html && /"@type"\s*:\s*"FlightReservation"/i.test(html)) return true;

  // Fallback for emails without markup but with clear flight-itinerary
  // shorthand (e.g. "Flight No: UA123", "PNR: ABC123 ... Departure ...").
  if (/\bflight\s*(no\.?|number)\s*[:\-]?\s*[A-Z]{1,3}\s?\d{2,4}\b/i.test(bodyText)) return true;
  if (/\b(PNR|booking reference|confirmation code)\b/i.test(bodyText) && /\b(departure|arrival|boarding|gate)\b/i.test(bodyText)) {
    return true;
  }

  return false;
}

export interface ParsedEmail {
  messageId: string;
  subject: string;
  from: string;
  date: string;
  bodyText: string;
  hasStructuredFlightData: boolean;
}

export async function fetchMessageContent(
  accessToken: string,
  messageId: string
): Promise<ParsedEmail | null> {
  const url = `${GMAIL_API_BASE}/messages/${messageId}?format=full`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    console.error(`Gmail message fetch failed for ${messageId}:`, await res.text());
    return null;
  }

  const message = (await res.json()) as GmailMessage;
  const headers = message.payload?.headers ?? [];
  const getHeader = (name: string) =>
    headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? "";

  const { text, html } = extractBody(message.payload as GmailMessagePart);
  const bodyText = (text ?? (html ? stripHtml(html) : "")).slice(0, 4000);

  return {
    messageId: message.id,
    subject: getHeader("Subject"),
    from: getHeader("From"),
    date: getHeader("Date"),
    bodyText,
    hasStructuredFlightData: looksLikeStructuredFlightData(html, bodyText),
  };
}
