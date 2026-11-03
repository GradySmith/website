// Trip/itinerary dates are stored as plain "YYYY-MM-DD" strings (Postgres
// `date` columns — no time or timezone). `new Date("YYYY-MM-DD")` parses
// that as UTC midnight, but `.getDate()` / `.setDate()` /
// `.toLocaleDateString()` all read/write in the LOCAL timezone. Anywhere
// west of UTC, that mismatch silently shifts the displayed day back by
// one (e.g. a Sept 1 itinerary day rendering as "Aug 31"). These helpers
// parse and offset date-only strings using local calendar components the
// whole way through, so there's never a UTC round-trip to introduce that
// shift.

export function parseDateOnly(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function addDaysToDateOnly(dateStr: string, days: number): Date {
  const date = parseDateOnly(dateStr);
  date.setDate(date.getDate() + days);
  return date;
}
