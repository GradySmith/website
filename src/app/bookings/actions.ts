"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase-server";
import {
  refreshGoogleAccessToken,
  searchBookingMessages,
  fetchMessageContent,
  type ParsedEmail,
  type BookingSearchType,
} from "@/lib/gmail";
import { createTrip } from "@/app/trips/actions";
import { geocodeLocation } from "@/lib/geocode";
import { getUsdRateForCurrency } from "@/lib/exchange-rate";
import { isBlogOwner } from "@/lib/destinations";
import type { BookingType, ItineraryItemType } from "@/types";

type ActionResult<T = undefined> =
  | ({ success: true } & (T extends undefined ? object : { data: T }))
  | { success: false; error: string };

// Gmail and screenshot scanning call the Anthropic API on the owner's bill,
// so they're owner-only for now.
const AI_OWNER_ONLY_ERROR = "Booking scanning is currently limited to the site owner.";

async function requireUserId(): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return (data?.claims?.sub as string | undefined) ?? null;
}

function toIsoOrNull(value?: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

// Confirming or editing a booking collects the date and time as two
// separate form fields (<input type="date"> + <input type="time">).
// Combines them into the same literal-value ISO timestamp the rest of
// the app already assumes — e.g. "2026-08-18" + "20:00" becomes
// "2026-08-18T20:00:00.000Z". Without this, bookings.start_at only ever
// captured the date and silently dropped whatever time was entered,
// which also meant re-opening a booking to edit it always showed a blank
// Time field — risking the correct time getting wiped from the mirrored
// itinerary item on the next save.
function combineDateAndTimeIso(dateStr?: string | null, timeStr?: string | null): string | null {
  if (!dateStr) return null;
  const time = timeStr?.trim() || "00:00";
  const date = new Date(`${dateStr}T${time}:00`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

// Shared by both the Gmail scan and the screenshot scan: Claude extracts
// each booking's cost in whatever currency the source states (a Wizz Air
// confirmation prices in HUF, a Hostelworld receipt might be in EUR, ...)
// but every other part of the app — Budget, Bookings, formatCurrency —
// assumes a stored booking cost is already in USD. `buildUsdRateMap` looks
// up a rate once per distinct currency in a batch; `toUsdCost` applies it,
// clearing the cost to null (rather than storing a wrong number) if the
// currency wasn't recognized or the lookup failed.
async function buildUsdRateMap(currencyCodes: Iterable<string>): Promise<Map<string, number | null>> {
  const rateMap = new Map<string, number | null>();
  await Promise.all(
    [...new Set(currencyCodes)].map(async (code) => {
      rateMap.set(code, await getUsdRateForCurrency(code));
    })
  );
  return rateMap;
}

function toUsdCost(
  cost: number | null | undefined,
  currency: string | undefined,
  rateMap: Map<string, number | null>
): number | null {
  if (cost == null) return null;
  const code = (currency || "USD").trim().toUpperCase();
  const rate = rateMap.get(code);
  if (rate == null) return null;
  return Math.round(cost * rate * 100) / 100;
}

// Kicks off the incremental-consent OAuth flow: same Google login Biyahe
// already uses, but with the gmail.readonly scope and offline access
// added on so Google hands back a refresh token we can use later without
// the user being present. Landing back in /auth/callback with
// gmail_connect=1 is what tells that route to store the tokens.
export async function connectGmail() {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      scopes: "https://www.googleapis.com/auth/gmail.readonly",
      queryParams: {
        access_type: "offline",
        prompt: "consent",
      },
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?next=/bookings&gmail_connect=1`,
    },
  });

  if (error) {
    redirect(`/bookings?error=${encodeURIComponent(error.message)}`);
  }

  if (data?.url) {
    redirect(data.url);
  }
}

export async function disconnectGmail(): Promise<ActionResult> {
  const supabase = await createClient();
  const userId = await requireUserId();
  if (!userId) return { success: false, error: "You need to be signed in." };

  const { error } = await supabase
    .from("email_connections")
    .delete()
    .eq("user_id", userId)
    .eq("provider", "google");

  if (error) return { success: false, error: error.message };

  revalidatePath("/bookings");
  return { success: true };
}

const EXTRACT_BOOKINGS_TOOL: Anthropic.Tool = {
  name: "extract_bookings",
  description:
    "Extract structured booking details from a batch of emails, flagging which ones are actually travel booking confirmations.",
  input_schema: {
    type: "object",
    properties: {
      results: {
        type: "array",
        items: {
          type: "object",
          properties: {
            messageId: {
              type: "string",
              description: "Must exactly match one of the provided email IDs",
            },
            isBooking: {
              type: "boolean",
              description:
                "True only if this email is an actual flight, hotel, car rental, train/bus/" +
                "ferry ticket, or activity booking confirmation — not a newsletter, price " +
                "alert, promo, or generic reminder",
            },
            type: {
              type: "string",
              enum: ["flight", "hotel", "activity", "car", "other"],
              description:
                "'flight' for any air travel leg — always use this, never 'activity', for a " +
                "flight confirmation, even a connecting/codeshare leg. 'hotel' for lodging. " +
                "'car' for ground transportation of any kind: car rental, train, bus, or " +
                "ferry. 'activity' for tours, reservations, tickets, and other things to do.",
            },
            title: {
              type: "string",
              description:
                "Short human-readable label, e.g. 'Flight to Tokyo (NRT)' or 'Hotel Gracery Shinjuku'",
            },
            confirmationNumber: { type: ["string", "null"] },
            startAt: {
              type: ["string", "null"],
              description:
                "ISO 8601 datetime for check-in / departure / reservation time. Include the " +
                "actual time-of-day (not just the date) whenever the email states one — a " +
                "flight's departure time, a hotel's check-in time, a restaurant's reservation " +
                "time, etc. Only omit the time portion if the email genuinely never mentions " +
                "one. Never invent a time that isn't in the email. Watch for DD/MM/YYYY dates " +
                "(common on non-US airlines) — don't misread '02/01/2027' as February 1st, " +
                "and never shift the date forward or backward based on flight-duration or " +
                "timezone guesswork; use exactly the date the email states unless it " +
                "explicitly says arrival is the next day.",
            },
            endAt: {
              type: ["string", "null"],
              description:
                "ISO 8601 date or datetime for check-out / return / reservation end, including " +
                "time-of-day if the email states one. Same date-format caution as startAt. For a " +
                "multi-night hotel/hostel stay this must be the actual checkout date, not the " +
                "same date as startAt — read both the check-in AND check-out lines rather than " +
                "assuming a one-night stay when the email doesn't say so explicitly.",
            },
            cost: {
              type: ["number", "null"],
              description:
                "The total price paid, as a plain number. Look for it near words like total, " +
                "amount charged, price, fare, or grand total — not a subtotal, tax line, or " +
                "someone else's itemized price. Null if no total price appears anywhere.",
            },
            currency: {
              type: "string",
              description: "3-letter currency code, default USD if unclear",
            },
            destinationGuess: {
              type: ["string", "null"],
              description:
                "The most specific location you can find — prefer a venue name and city over " +
                "just a city (e.g. 'Hilton Tokyo Shinjuku, Tokyo' or 'Oro, Rio de Janeiro' " +
                "rather than just 'Tokyo' or 'Brazil'). For flights, use the destination " +
                "airport's city. Fall back to just a city or region if no venue/address is in " +
                "the email — never fabricate an address that isn't there.",
            },
          },
          required: ["messageId", "isBooking", "type", "title", "currency"],
        },
      },
    },
    required: ["results"],
  },
};

interface ExtractedResult {
  messageId: string;
  isBooking: boolean;
  type: BookingType;
  title: string;
  confirmationNumber?: string | null;
  startAt?: string | null;
  endAt?: string | null;
  cost?: number | null;
  currency: string;
  destinationGuess?: string | null;
}

// Scans the last `sinceDays` of the user's Gmail inbox for likely
// booking confirmations, sends the candidates through Claude to pull out
// structured details, and stages anything real into detected_bookings
// for the user to review — nothing touches the real `bookings` table
// until they confirm it on the Bookings page.
export async function scanGmailForBookings(
  sinceDays = 90,
  searchType: BookingSearchType = "all"
): Promise<ActionResult<{ scanned: number; found: number }>> {
  const supabase = await createClient();
  const userId = await requireUserId();
  if (!userId) return { success: false, error: "You need to be signed in." };
  if (!(await isBlogOwner())) return { success: false, error: AI_OWNER_ONLY_ERROR };

  // Clamp to a sane range — Gmail's newer_than works for any window, but
  // there's no reason to let a stray input search 10 years of mail.
  const clampedDays = Math.min(Math.max(Math.round(sinceDays), 1), 365);

  const { data: connection, error: connError } = await supabase
    .from("email_connections")
    .select("*")
    .eq("user_id", userId)
    .eq("provider", "google")
    .single();

  if (connError || !connection?.refresh_token) {
    return { success: false, error: "Gmail isn't connected yet." };
  }

  const accessToken = await refreshGoogleAccessToken(connection.refresh_token);
  if (!accessToken) {
    return {
      success: false,
      error: "Couldn't refresh your Gmail access — try disconnecting and reconnecting Gmail.",
    };
  }

  const messageRefs = await searchBookingMessages(accessToken, clampedDays, 25, searchType);

  await supabase
    .from("email_connections")
    .update({ last_scanned_at: new Date().toISOString() })
    .eq("id", connection.id);

  if (messageRefs.length === 0) {
    revalidatePath("/bookings");
    return { success: true, data: { scanned: 0, found: 0 } };
  }

  // Skip messages already scanned in a previous pass, so repeat scans
  // stay cheap and don't re-prompt for the same booking twice.
  const { data: alreadySeen } = await supabase
    .from("detected_bookings")
    .select("source_message_id")
    .eq("user_id", userId)
    .in(
      "source_message_id",
      messageRefs.map((ref) => ref.id)
    );

  const seenIds = new Set((alreadySeen ?? []).map((row) => row.source_message_id as string));
  const newRefs = messageRefs.filter((ref) => !seenIds.has(ref.id));

  if (newRefs.length === 0) {
    revalidatePath("/bookings");
    return { success: true, data: { scanned: messageRefs.length, found: 0 } };
  }

  const emails = (
    await Promise.all(newRefs.map((ref) => fetchMessageContent(accessToken, ref.id)))
  ).filter((email): email is ParsedEmail => email !== null);

  if (emails.length === 0) {
    revalidatePath("/bookings");
    return { success: true, data: { scanned: messageRefs.length, found: 0 } };
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return {
      success: false,
      error: "ANTHROPIC_API_KEY isn't set in .env.local yet. Add it, then restart npm run dev.",
    };
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const prompt = [
    "Here are emails from a traveler's inbox that matched a booking-related search.",
    "For EACH email, decide if it's a real flight, hotel, car rental, or activity",
    "booking confirmation (not a newsletter, price alert, or generic reminder), and",
    "if so extract its details. Return exactly one result per email, using the same",
    "messageId given below. Call the extract_bookings tool with your answer.",
    "",
    "For every real booking, actively look for all five of: the type of booking, the",
    "date AND time, the cost, the specific location (venue/address, not just a city),",
    "and a confirmation number. Read the whole email body for these — they're often in",
    "a details table below the headline, not the opening paragraph. It's fine and",
    "expected to leave a field null if the email genuinely doesn't contain it; the",
    "person reviewing these will fill in anything you couldn't find, either right away",
    "or later — so leaving something null is always better than guessing at a value.",
    "",
    "Flights are always type 'flight', never 'activity' — this applies to every leg of",
    "a multi-leg trip, including connections. Ground transportation (train, bus, ferry,",
    "car rental) is type 'car'.",
    "",
    "Some emails below are marked 'Structured flight data detected: yes' — this means the",
    "email's HTML contains schema.org flight-reservation markup, the same signal Gmail",
    "and Apple Mail use to auto-detect a flight and offer to add it to your calendar.",
    "Treat that as a strong, reliable signal the email is a real flight booking (type",
    "'flight'), even if the visible text looks sparse or the subject line is generic —",
    "read the full body carefully for the flight number, date/time, and confirmation",
    "code rather than dismissing it as not a booking.",
    "",
    "Dates in these emails are frequently DD/MM/YYYY (most non-US airlines and hotels",
    "use this format), not MM/DD/YYYY — read '02/01/2027' as 2 January 2027, not",
    "February 1st. If the email states the same date in words anywhere (e.g. 'Jan 2,",
    "2027'), use that to confirm your reading of any numeric date nearby. Use exactly",
    "the date and time the email states — never shift a date forward or back based on",
    "your own flight-duration or timezone math; only treat arrival as the next day if",
    "the email itself explicitly says so (e.g. 'overnight', '+1 day', or two different",
    "calendar dates given for departure vs. arrival).",
    "",
    ...emails.map((email, index) =>
      [
        `--- Email ${index + 1} ---`,
        `messageId: ${email.messageId}`,
        `From: ${email.from}`,
        `Subject: ${email.subject}`,
        `Date: ${email.date}`,
        `Structured flight data detected: ${email.hasStructuredFlightData ? "yes" : "no"}`,
        `Body: ${email.bodyText}`,
      ].join("\n")
    ),
  ].join("\n");

  let toolInput: unknown;
  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 4096,
      tools: [EXTRACT_BOOKINGS_TOOL],
      tool_choice: { type: "tool", name: "extract_bookings" },
      messages: [{ role: "user", content: prompt }],
    });

    if (message.stop_reason === "max_tokens") {
      return {
        success: false,
        error: "Claude's response got cut off parsing emails. Try scanning again.",
      };
    }

    const block = message.content.find(
      (candidate) => candidate.type === "tool_use" && candidate.name === "extract_bookings"
    );

    if (!block || block.type !== "tool_use") {
      return { success: false, error: "Claude didn't return structured results. Try again." };
    }

    toolInput = block.input;
  } catch (error) {
    console.error("scanGmailForBookings: Claude call failed:", error);
    return { success: false, error: "Something went wrong parsing your emails. Try again." };
  }

  const rawResults = (toolInput as { results?: unknown }).results;
  if (!Array.isArray(rawResults)) {
    console.error("scanGmailForBookings: unexpected tool input shape:", JSON.stringify(toolInput));
    return { success: false, error: "Claude returned results in an unexpected format." };
  }

  const results = rawResults as ExtractedResult[];

  const usdRateByCurrency = await buildUsdRateMap(
    results
      .filter((result) => result.isBooking && result.cost != null)
      .map((result) => (result.currency || "USD").trim().toUpperCase())
  );

  const bookingsToInsert = results
    .filter((result) => result.isBooking && result.title)
    .map((result) => {
      const email = emails.find((candidate) => candidate.messageId === result.messageId);
      return {
        user_id: userId,
        source_message_id: result.messageId,
        type: result.type ?? "other",
        title: result.title,
        confirmation_number: result.confirmationNumber || null,
        start_at: toIsoOrNull(result.startAt),
        end_at: toIsoOrNull(result.endAt),
        cost: toUsdCost(result.cost, result.currency, usdRateByCurrency),
        currency: "USD",
        destination_guess: result.destinationGuess || null,
        raw_snippet: email?.bodyText.slice(0, 500) ?? null,
        status: "pending" as const,
      };
    });

  let insertedCount = 0;
  if (bookingsToInsert.length > 0) {
    const { data: inserted, error: insertError } = await supabase
      .from("detected_bookings")
      .upsert(bookingsToInsert, { onConflict: "user_id,source_message_id", ignoreDuplicates: true })
      .select("id");

    if (insertError) {
      console.error("Failed to insert detected bookings:", insertError.message);
    } else {
      insertedCount = inserted?.length ?? 0;
    }
  }

  revalidatePath("/bookings");
  return { success: true, data: { scanned: emails.length, found: insertedCount } };
}

const SUPPORTED_SCREENSHOT_TYPES = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);
const MAX_SCREENSHOTS_PER_SCAN = 6;

const EXTRACT_SCREENSHOT_BOOKINGS_TOOL: Anthropic.Tool = {
  name: "extract_bookings_from_screenshot",
  description:
    "Extract every distinct booking visible in one or more screenshots of a travel site's " +
    "'My Trips' / bookings list page.",
  input_schema: {
    type: "object",
    properties: {
      results: {
        type: "array",
        items: {
          type: "object",
          properties: {
            type: {
              type: "string",
              enum: ["flight", "hotel", "activity", "car", "other"],
              description:
                "'hotel' for any hostel/hotel/apartment stay (Hostelworld and Airbnb listings " +
                "are always 'hotel'). 'flight' for air travel. 'car' for ground transportation.",
            },
            title: {
              type: "string",
              description:
                "Short human-readable label combining the property/flight name and city, e.g. " +
                "'Wombat's City Hostel, Vienna' or 'Flight to Lisbon (LIS)'",
            },
            confirmationNumber: { type: ["string", "null"] },
            startAt: {
              type: ["string", "null"],
              description:
                "ISO 8601 date for check-in / departure, exactly as shown. Null if not visible.",
            },
            endAt: {
              type: ["string", "null"],
              description:
                "ISO 8601 date for check-out / return, exactly as shown. For a hotel/hostel " +
                "stay this MUST be a different (later) date than startAt — never repeat " +
                "startAt here. A displayed range like '18 Aug - 22 Aug' means startAt=18 Aug, " +
                "endAt=22 Aug. Null only if there's truly no checkout date or duration visible.",
            },
            cost: {
              type: ["number", "null"],
              description: "The total price shown, as a plain number. Null if no price is visible.",
            },
            currency: {
              type: "string",
              description: "3-letter currency code as shown (e.g. EUR, GBP), default USD if unclear.",
            },
            destinationGuess: {
              type: ["string", "null"],
              description: "The most specific location visible — property name and city if both shown.",
            },
          },
          required: ["type", "title", "currency"],
        },
      },
    },
    required: ["results"],
  },
};

interface ScreenshotExtractedResult {
  type: BookingType;
  title: string;
  confirmationNumber?: string | null;
  startAt?: string | null;
  endAt?: string | null;
  cost?: number | null;
  currency: string;
  destinationGuess?: string | null;
}

export interface ScreenshotImageInput {
  base64: string;
  mediaType: string;
}

// Vision-based sibling to scanGmailForBookings: lets a user upload one or
// more screenshots of a booking site's "My Trips" page (Hostelworld,
// Airbnb, or anything else) instead of connecting an inbox. Same staging
// flow — everything lands in detected_bookings as 'pending' for the user
// to review on the Bookings page, nothing touches the real `bookings`
// table until they confirm. Since a screenshot has no email message ID to
// key off of, each extracted result gets a fresh synthetic one.
export async function scanBookingScreenshots(
  images: ScreenshotImageInput[]
): Promise<ActionResult<{ found: number }>> {
  const userId = await requireUserId();
  if (!userId) return { success: false, error: "You need to be signed in." };
  if (!(await isBlogOwner())) return { success: false, error: AI_OWNER_ONLY_ERROR };

  if (images.length === 0) {
    return { success: false, error: "Add at least one screenshot first." };
  }
  if (images.length > MAX_SCREENSHOTS_PER_SCAN) {
    return { success: false, error: `Scan up to ${MAX_SCREENSHOTS_PER_SCAN} screenshots at a time.` };
  }
  for (const image of images) {
    if (!SUPPORTED_SCREENSHOT_TYPES.has(image.mediaType)) {
      return { success: false, error: "Screenshots must be JPEG, PNG, GIF, or WebP images." };
    }
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return {
      success: false,
      error: "ANTHROPIC_API_KEY isn't set in .env.local yet. Add it, then restart npm run dev.",
    };
  }

  const supabase = await createClient();
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const promptText = [
    "The attached image(s) are screenshot(s) of a travel booking website's 'My Trips' or",
    "bookings list page (e.g. Hostelworld, Airbnb, Booking.com). Identify every distinct",
    "booking/reservation shown and extract its details by calling the",
    "extract_bookings_from_screenshot tool.",
    "",
    "If more than one image is attached, treat them together as one continuous list — the",
    "user may have scrolled and taken multiple screenshots, so the same booking could appear",
    "in more than one image. Only report each real booking ONCE even if it's visible in",
    "multiple screenshots (match by property/flight name and dates to spot the overlap).",
    "",
    "For each booking, extract: the type, a short title combining the property/flight name",
    "and city, the check-in/departure and check-out/return dates if visible, the total price",
    "and its currency exactly as shown, a confirmation number if shown, and the most specific",
    "location you can read. Leave a field null rather than guessing if it isn't visible.",
    "",
    "Accommodation bookings (hostels, hotels, apartments) are almost always multi-night —",
    "startAt and endAt must be the check-in and check-out dates as TWO DISTINCT dates, not",
    "the same date repeated. Hostelworld and Airbnb trip lists usually show this as a single",
    "compact range like '18 Aug - 22 Aug 2026' or '18 - 22 Aug' — read the range's start as",
    "startAt and its end as endAt; don't collapse it down to just one of those dates. If you",
    "can only find one date for a stay, look for a separate 'nights' or duration count nearby",
    "(e.g. '4 nights') and use it to infer the missing end date; only leave endAt null if",
    "there's truly no way to determine a length of stay.",
    "",
    "Ignore anything that isn't an actual confirmed booking — promotional banners, search",
    "results, wishlist items, or trips explicitly marked cancelled shouldn't be included.",
  ].join("\n");

  let toolInput: unknown;
  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 4096,
      tools: [EXTRACT_SCREENSHOT_BOOKINGS_TOOL],
      tool_choice: { type: "tool", name: "extract_bookings_from_screenshot" },
      messages: [
        {
          role: "user",
          content: [
            ...images.map(
              (image): Anthropic.ImageBlockParam => ({
                type: "image",
                source: {
                  type: "base64",
                  media_type: image.mediaType as Anthropic.Base64ImageSource["media_type"],
                  data: image.base64,
                },
              })
            ),
            { type: "text", text: promptText },
          ],
        },
      ],
    });

    if (message.stop_reason === "max_tokens") {
      return {
        success: false,
        error: "Claude's response got cut off reading the screenshot. Try scanning fewer at once.",
      };
    }

    const block = message.content.find(
      (candidate) =>
        candidate.type === "tool_use" && candidate.name === "extract_bookings_from_screenshot"
    );

    if (!block || block.type !== "tool_use") {
      return { success: false, error: "Claude didn't return structured results. Try again." };
    }

    toolInput = block.input;
  } catch (error) {
    console.error("scanBookingScreenshots: Claude call failed:", error);
    return { success: false, error: "Something went wrong reading the screenshot. Try again." };
  }

  const rawResults = (toolInput as { results?: unknown }).results;
  if (!Array.isArray(rawResults)) {
    console.error("scanBookingScreenshots: unexpected tool input shape:", JSON.stringify(toolInput));
    return { success: false, error: "Claude returned results in an unexpected format." };
  }

  const results = rawResults as ScreenshotExtractedResult[];

  const usdRateByCurrency = await buildUsdRateMap(
    results.filter((result) => result.cost != null).map((result) => (result.currency || "USD").trim().toUpperCase())
  );

  const bookingsToInsert = results
    .filter((result) => result.title)
    .map((result) => ({
      user_id: userId,
      source_message_id: `screenshot-${crypto.randomUUID()}`,
      type: result.type ?? "other",
      title: result.title,
      confirmation_number: result.confirmationNumber || null,
      start_at: toIsoOrNull(result.startAt),
      end_at: toIsoOrNull(result.endAt),
      cost: toUsdCost(result.cost, result.currency, usdRateByCurrency),
      currency: "USD",
      destination_guess: result.destinationGuess || null,
      raw_snippet: "Extracted from an uploaded screenshot.",
      status: "pending" as const,
    }));

  let insertedCount = 0;
  if (bookingsToInsert.length > 0) {
    const { data: inserted, error: insertError } = await supabase
      .from("detected_bookings")
      .insert(bookingsToInsert)
      .select("id");

    if (insertError) {
      console.error("Failed to insert screenshot-detected bookings:", insertError.message);
      return { success: false, error: "Couldn't save what was found. Try again." };
    }
    insertedCount = inserted?.length ?? 0;
  }

  revalidatePath("/bookings");
  return { success: true, data: { found: insertedCount } };
}

// A booking's `type` has 5 values but an itinerary item only distinguishes
// three (see migrations 0006/0008) — hotel nights become "accommodation"
// pins, flights become "flight" pins, everything else (activity/car/
// other) becomes a generic "activity" pin.
function itineraryTypeForBooking(type: BookingType): ItineraryItemType {
  if (type === "hotel") return "accommodation";
  if (type === "flight") return "flight";
  return "activity";
}

// Shared by confirmDetectedBooking and updateBooking: makes sure the
// trip's date range covers this booking's date, then creates or (if one
// already exists for this booking — migration 0007's source_booking_id)
// updates the mirrored itinerary_items row, so a booking's Itinerary/Map
// entry always reflects its latest date/time/location/type. Best-effort —
// callers wrap this in try/catch so a geocoding hiccup never blocks the
// booking itself from saving.
async function syncItineraryFromBooking(
  supabase: Awaited<ReturnType<typeof createClient>>,
  {
    tripId,
    bookingId,
    type,
    title,
    startAtIso,
    endAtIso,
    startTime,
    locationName,
  }: {
    tripId: string;
    bookingId: string;
    type: BookingType;
    title: string;
    startAtIso: string;
    endAtIso?: string | null;
    startTime?: string;
    locationName?: string;
  }
) {
  const { data: tripRow } = await supabase
    .from("trips")
    .select("start_date, end_date")
    .eq("id", tripId)
    .single();

  const bookingDateOnly = startAtIso.slice(0, 10);
  // A booking's end date only matters here for a real multi-night stay —
  // a same-day or missing end date collapses back to a single-day item,
  // same as before this existed.
  const bookingEndDateOnly = endAtIso ? endAtIso.slice(0, 10) : bookingDateOnly;
  const latestBookingDateOnly =
    bookingEndDateOnly > bookingDateOnly ? bookingEndDateOnly : bookingDateOnly;
  let tripStartDate = tripRow?.start_date as string | null | undefined;
  let tripEndDate = tripRow?.end_date as string | null | undefined;
  const tripDateUpdates: { start_date?: string; end_date?: string } = {};

  if (!tripStartDate) {
    // No dates on the trip yet — anchor it to this booking so it lands
    // on a real, visible day instead of defaulting to Day 1 for no reason.
    tripStartDate = bookingDateOnly;
    tripDateUpdates.start_date = bookingDateOnly;
  } else if (bookingDateOnly < tripStartDate) {
    // Booking falls before the trip's current start — shift every
    // existing itinerary item forward by the gap so their day numbers
    // stay correct once the start date moves back to include this one.
    const shiftDays = Math.round(
      (new Date(tripStartDate).getTime() - new Date(bookingDateOnly).getTime()) /
        (1000 * 60 * 60 * 24)
    );
    const { data: existingItems } = await supabase
      .from("itinerary_items")
      .select("id, day_number, end_day_number")
      .eq("trip_id", tripId)
      .is("deleted_at", null);
    if (existingItems && existingItems.length > 0) {
      await Promise.all(
        existingItems.map((item) =>
          supabase
            .from("itinerary_items")
            .update({
              day_number: (item.day_number as number) + shiftDays,
              end_day_number:
                item.end_day_number != null ? (item.end_day_number as number) + shiftDays : null,
            })
            .eq("id", item.id)
        )
      );
    }
    tripStartDate = bookingDateOnly;
    tripDateUpdates.start_date = bookingDateOnly;
  }

  if (!tripEndDate || latestBookingDateOnly > tripEndDate) {
    tripEndDate = latestBookingDateOnly;
    tripDateUpdates.end_date = latestBookingDateOnly;
  }

  if (Object.keys(tripDateUpdates).length > 0) {
    const { error: tripUpdateError } = await supabase
      .from("trips")
      .update(tripDateUpdates)
      .eq("id", tripId);
    if (tripUpdateError) {
      console.error("Failed to expand trip dates for booking:", tripUpdateError.message);
    }
  }

  const diffDays = Math.round(
    (new Date(bookingDateOnly).getTime() - new Date(tripStartDate).getTime()) /
      (1000 * 60 * 60 * 24)
  );
  const dayNumber = Math.max(1, diffDays + 1);

  const endDiffDays = Math.round(
    (new Date(bookingEndDateOnly).getTime() - new Date(tripStartDate).getTime()) /
      (1000 * 60 * 60 * 24)
  );
  const computedEndDayNumber = Math.max(1, endDiffDays + 1);
  // Only a real range (checkout after check-in) sets end_day_number —
  // anything else stays a single-day item, same as before this existed.
  const endDayNumber = computedEndDayNumber > dayNumber ? computedEndDayNumber : null;

  const geocoded = locationName?.trim() ? await geocodeLocation(locationName.trim()) : null;

  const itemFields = {
    trip_id: tripId,
    day_number: dayNumber,
    end_day_number: endDayNumber,
    title: title.trim(),
    location_name: locationName?.trim() || null,
    latitude: geocoded?.latitude ?? null,
    longitude: geocoded?.longitude ?? null,
    start_time: startTime?.trim() || null,
    item_type: itineraryTypeForBooking(type),
    source_booking_id: bookingId,
  };

  const { data: existingItem } = await supabase
    .from("itinerary_items")
    .select("id")
    .eq("source_booking_id", bookingId)
    .maybeSingle();

  if (existingItem) {
    const { error } = await supabase
      .from("itinerary_items")
      .update(itemFields)
      .eq("id", existingItem.id);
    if (error) {
      console.error("Failed to update mirrored itinerary item:", error.message);
    }
  } else {
    const { count } = await supabase
      .from("itinerary_items")
      .select("id", { count: "exact", head: true })
      .eq("trip_id", tripId)
      .eq("day_number", dayNumber)
      .is("deleted_at", null);

    const { error } = await supabase
      .from("itinerary_items")
      .insert({ ...itemFields, sort_order: count ?? 0 });
    if (error) {
      console.error("Failed to mirror booking into itinerary_items:", error.message);
    }
  }
}

// Turns a reviewed detected_booking into a real row in `bookings` (so it
// shows up on the Bookings page and in Budget totals), either against an
// existing trip or a brand new one, then marks the staged row confirmed so
// it drops off the review list.
//
// It also mirrors the booking into `itinerary_items` — geocoding the
// extracted location and picking a day number from the trip's start date
// — so a confirmed flight/hotel/activity immediately shows up on the
// Itinerary tab and as a pin on the Map tab too, not just in Bookings.
export async function confirmDetectedBooking({
  detectedId,
  tripId,
  newTripTitle,
  newTripDestination,
  type,
  title,
  confirmationNumber,
  startAt,
  startTime,
  endAt,
  cost,
  locationName,
}: {
  detectedId: string;
  tripId?: string;
  newTripTitle?: string;
  newTripDestination?: string;
  type: BookingType;
  title: string;
  confirmationNumber?: string;
  startAt: string;
  startTime?: string;
  endAt?: string;
  cost?: number;
  locationName?: string;
}): Promise<ActionResult<{ tripId: string }>> {
  const supabase = await createClient();
  const userId = await requireUserId();
  if (!userId) return { success: false, error: "You need to be signed in." };

  if (!title.trim()) {
    return { success: false, error: "Title is required." };
  }
  const startAtIso = combineDateAndTimeIso(startAt, startTime);
  if (!startAtIso) {
    return { success: false, error: "A valid start date is required." };
  }

  let resolvedTripId = tripId;
  if (!resolvedTripId) {
    if (!newTripDestination?.trim()) {
      return { success: false, error: "Pick a trip, or enter a destination for a new one." };
    }
    const created = await createTrip({
      title: newTripTitle?.trim() || newTripDestination.trim(),
      destination: newTripDestination.trim(),
    });
    if (!created.success) return created;
    resolvedTripId = created.data.tripId;
  }

  const { data: insertedBooking, error: insertError } = await supabase
    .from("bookings")
    .insert({
      trip_id: resolvedTripId,
      type,
      title: title.trim(),
      confirmation_number: confirmationNumber?.trim() || null,
      start_at: startAtIso,
      end_at: toIsoOrNull(endAt),
      cost: cost ?? null,
    })
    .select("id")
    .single();

  if (insertError || !insertedBooking) {
    return { success: false, error: insertError?.message ?? "Couldn't save this booking." };
  }

  const { error: updateError } = await supabase
    .from("detected_bookings")
    .update({ status: "confirmed", trip_id: resolvedTripId })
    .eq("id", detectedId)
    .eq("user_id", userId);

  if (updateError) {
    console.error("Failed to mark detected booking confirmed:", updateError.message);
  }

  // Mirror into itinerary_items so this shows up on the Itinerary tab and
  // (once geocoded) as a pin on the Map tab. Best-effort — a geocoding
  // miss or day-number quirk shouldn't block the booking itself from
  // saving, so failures here are logged, not surfaced as an error.
  try {
    await syncItineraryFromBooking(supabase, {
      tripId: resolvedTripId,
      bookingId: insertedBooking.id as string,
      type,
      title,
      startAtIso,
      endAtIso: toIsoOrNull(endAt),
      startTime,
      locationName,
    });
  } catch (error) {
    console.error("Failed to build itinerary item for confirmed booking:", error);
  }

  revalidatePath("/bookings");
  revalidatePath("/budget");
  revalidatePath("/trips");
  revalidatePath(`/trips/${resolvedTripId}`);
  revalidatePath(`/trips/${resolvedTripId}/budget`);
  revalidatePath(`/trips/${resolvedTripId}/itinerary`);
  revalidatePath(`/trips/${resolvedTripId}/map`);
  return { success: true, data: { tripId: resolvedTripId } };
}

// Edits an already-confirmed booking — lets the user fill in details they
// skipped at confirm time (or fix ones Claude got wrong) whenever they're
// ready, "now or later," rather than only at the moment of confirming.
// Also re-syncs the mirrored itinerary item so the Map/Itinerary tabs
// pick up the change.
export async function updateBooking({
  bookingId,
  tripId,
  type,
  title,
  confirmationNumber,
  startAt,
  startTime,
  endAt,
  cost,
  locationName,
}: {
  bookingId: string;
  tripId: string;
  type: BookingType;
  title: string;
  confirmationNumber?: string;
  startAt: string;
  startTime?: string;
  endAt?: string;
  cost?: number;
  locationName?: string;
}): Promise<ActionResult> {
  const supabase = await createClient();
  const userId = await requireUserId();
  if (!userId) return { success: false, error: "You need to be signed in." };

  if (!title.trim()) {
    return { success: false, error: "Title is required." };
  }
  const startAtIso = combineDateAndTimeIso(startAt, startTime);
  if (!startAtIso) {
    return { success: false, error: "A valid date is required." };
  }

  const { error: updateError } = await supabase
    .from("bookings")
    .update({
      type,
      title: title.trim(),
      confirmation_number: confirmationNumber?.trim() || null,
      start_at: startAtIso,
      end_at: toIsoOrNull(endAt),
      cost: cost ?? null,
    })
    .eq("id", bookingId);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  try {
    await syncItineraryFromBooking(supabase, {
      tripId,
      bookingId,
      type,
      title,
      startAtIso,
      endAtIso: toIsoOrNull(endAt),
      startTime,
      locationName,
    });
  } catch (error) {
    console.error("Failed to sync itinerary item for updated booking:", error);
  }

  revalidatePath("/bookings");
  revalidatePath("/budget");
  revalidatePath("/trips");
  revalidatePath(`/trips/${tripId}`);
  revalidatePath(`/trips/${tripId}/budget`);
  revalidatePath(`/trips/${tripId}/itinerary`);
  revalidatePath(`/trips/${tripId}/map`);
  return { success: true };
}

// Soft-delete — sets deleted_at instead of removing the row, so it (and
// its mirrored itinerary item, deleted alongside it) can be found and
// restored from the trip's Trash view.
export async function deleteBooking(bookingId: string, tripId: string) {
  const supabase = await createClient();
  const deletedAt = new Date().toISOString();

  const { error } = await supabase
    .from("bookings")
    .update({ deleted_at: deletedAt })
    .eq("id", bookingId);

  if (error) {
    console.error("deleteBooking error:", error.message);
  }

  const { error: itineraryError } = await supabase
    .from("itinerary_items")
    .update({ deleted_at: deletedAt })
    .eq("source_booking_id", bookingId);

  if (itineraryError) {
    console.error("Failed to soft-delete mirrored itinerary item:", itineraryError.message);
  }

  revalidatePath("/bookings");
  revalidatePath("/budget");
  revalidatePath("/trips");
  revalidatePath(`/trips/${tripId}`);
  revalidatePath(`/trips/${tripId}/budget`);
  revalidatePath(`/trips/${tripId}/itinerary`);
  revalidatePath(`/trips/${tripId}/map`);
  revalidatePath("/trash");
}

export async function restoreBooking(bookingId: string, tripId: string): Promise<ActionResult> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("bookings")
    .update({ deleted_at: null })
    .eq("id", bookingId);

  if (error) {
    return { success: false, error: error.message };
  }

  const { error: itineraryError } = await supabase
    .from("itinerary_items")
    .update({ deleted_at: null })
    .eq("source_booking_id", bookingId);

  if (itineraryError) {
    console.error("Failed to restore mirrored itinerary item:", itineraryError.message);
  }

  revalidatePath("/bookings");
  revalidatePath("/budget");
  revalidatePath("/trips");
  revalidatePath(`/trips/${tripId}`);
  revalidatePath(`/trips/${tripId}/budget`);
  revalidatePath(`/trips/${tripId}/itinerary`);
  revalidatePath(`/trips/${tripId}/map`);
  revalidatePath("/trash");
  return { success: true };
}

export async function dismissDetectedBooking(detectedId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const userId = await requireUserId();
  if (!userId) return { success: false, error: "You need to be signed in." };

  const { error } = await supabase
    .from("detected_bookings")
    .update({ status: "dismissed" })
    .eq("id", detectedId)
    .eq("user_id", userId);

  if (error) return { success: false, error: error.message };

  revalidatePath("/bookings");
  return { success: true };
}
