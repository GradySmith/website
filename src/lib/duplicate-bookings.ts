// Best-effort duplicate detection: flags pairs of confirmed bookings on
// the same trip, on the same calendar day, whose titles share enough
// words to plausibly be the same real-world booking (e.g. a summary
// itinerary email and the individual airline confirmations for the same
// flight, or the same hotel confirmed twice from two different emails).
// Pure heuristic, not a hard match — always shown as a suggestion the
// user can dismiss or act on, never auto-deleted.

import type { Booking } from "@/types";

const STOPWORDS = new Set([
  "the",
  "and",
  "for",
  "via",
  "from",
  "with",
  "flight",
  "hotel",
  "booking",
  "reservation",
  "confirmed",
  "to",
  "at",
]);

function significantWords(title: string): Set<string> {
  return new Set(
    title
      .toLowerCase()
      .replace(/[()]/g, " ")
      .split(/[^a-z0-9]+/)
      .filter((word) => word.length > 2 && !STOPWORDS.has(word))
  );
}

export interface DuplicateBookingPair {
  a: Booking;
  b: Booking;
}

export function findPossibleDuplicateBookings(bookings: Booking[]): DuplicateBookingPair[] {
  const pairs: DuplicateBookingPair[] = [];

  for (let i = 0; i < bookings.length; i++) {
    for (let j = i + 1; j < bookings.length; j++) {
      const a = bookings[i];
      const b = bookings[j];
      if (a.trip_id !== b.trip_id) continue;
      if (a.start_at.slice(0, 10) !== b.start_at.slice(0, 10)) continue;

      const wordsA = significantWords(a.title);
      const wordsB = significantWords(b.title);
      if (wordsA.size === 0 || wordsB.size === 0) continue;

      const shared = [...wordsA].filter((word) => wordsB.has(word));
      const overlapRatio = shared.length / Math.min(wordsA.size, wordsB.size);

      if (shared.length >= 2 && overlapRatio >= 0.5) {
        pairs.push({ a, b });
      }
    }
  }

  return pairs;
}
