export type Interest =
  | "Beaches"
  | "Mountains"
  | "Cities"
  | "Culture"
  | "Food"
  | "Nightlife"
  | "Nature"
  | "History"
  | "Adventure"
  | "Shopping"
  | "Wellness"
  | "Cold weather"
  | "Warm weather";

export type TravelStyle = "Cultural" | "Relaxed" | "Adventure" | "Luxury" | "Budget";

export type BudgetLevel = "Budget" | "Mid-range" | "Luxury";

export interface DestinationQuery {
  interests: Interest[];
  region: string;
  travelStyle: TravelStyle;
  duration: string;
  month: string;
  budget: BudgetLevel;
}

export interface BlogDestination {
  id: string;
  slug: string;
  name: string;
  country: string | null;
  summary: string | null;
  body: string | null;
  best_time: string | null;
  tips: string[];
  cover_image_url: string | null;
  video_url: string | null;
  published: boolean;
  created_at: string;
  updated_at: string;
}

export interface DestinationPhoto {
  url: string;
  thumbnailUrl: string;
  creator: string;
  creatorUrl?: string;
  sourceUrl: string;
  license: string;
}

// What Claude returns via the suggest_destinations tool — no photos yet,
// those get attached server-side after Claude responds.
export interface DestinationSuggestionBase {
  name: string;
  country: string;
  pronunciation: string;
  summary: string;
  highlights: string[];
  bestTimeToVisit: string;
  estimatedBudgetPerPerson: string;
}

export interface DestinationSuggestion extends DestinationSuggestionBase {
  photos: DestinationPhoto[];
}

// These match the Postgres column names in supabase/migrations/0001_init.sql
// (snake_case) rather than being remapped to camelCase, since that's what
// supabase-js returns from queries by default.

export type TripStatus = "planning" | "confirmed" | "completed";

export interface Trip {
  id: string;
  user_id: string;
  destination: string;
  start_date: string | null;
  end_date: string | null;
  cover_image_url: string | null;
  created_at: string;
  title: string | null;
  status: TripStatus;
  description: string | null;
  budget_amount: number | null;
  visa_fees: number;
  food_per_day: number;
  beverages_per_day: number;
  splurge_total: number;
}

export type ItineraryItemType = "activity" | "accommodation" | "flight";

export interface ItineraryItem {
  id: string;
  trip_id: string;
  day_number: number;
  end_day_number: number | null;
  title: string;
  location_name: string | null;
  latitude: number | null;
  longitude: number | null;
  start_time: string | null;
  sort_order: number;
  item_type: ItineraryItemType;
  source_booking_id: string | null;
  deleted_at: string | null;
  created_at: string;
}

export interface Booking {
  id: string;
  trip_id: string;
  type: "flight" | "hotel" | "activity" | "car" | "other";
  title: string;
  confirmation_number: string | null;
  start_at: string;
  end_at: string | null;
  cost: number | null;
  currency: string;
  deleted_at: string | null;
  created_at: string;
}

export interface TripDay {
  id: string;
  trip_id: string;
  day_number: number;
  nickname: string | null;
  created_at: string;
}

export interface BudgetLine {
  id: string;
  trip_id: string;
  category: "flights" | "lodging" | "food" | "activities" | "transport" | "other";
  label: string;
  amount: number;
  currency: string;
  created_at: string;
}

export interface EmailConnection {
  id: string;
  user_id: string;
  provider: "google" | "microsoft";
  connected_at: string;
  last_scanned_at: string | null;
  // access_token / refresh_token are read server-side only — never sent
  // to the client, so they're intentionally left off this shared type.
}

export type BookingType = "flight" | "hotel" | "activity" | "car" | "other";
export type DetectedBookingStatus = "pending" | "confirmed" | "dismissed";

export interface DetectedBooking {
  id: string;
  user_id: string;
  trip_id: string | null;
  source_message_id: string;
  type: BookingType;
  title: string;
  confirmation_number: string | null;
  start_at: string | null;
  end_at: string | null;
  cost: number | null;
  currency: string;
  destination_guess: string | null;
  raw_snippet: string | null;
  status: DetectedBookingStatus;
  created_at: string;
}
