import type { BudgetLevel, Interest, TravelStyle } from "@/types";

export interface CuratedDestination {
  name: string;
  country: string;
  region: "Asia" | "Europe" | "Americas" | "Africa" | "Oceania";
  interests: Interest[];
  travelStyles: TravelStyle[];
  budgetLevels: BudgetLevel[];
}

// NOT CURRENTLY WIRED IN. This was a fixed candidate pool Discover's
// suggestions were briefly constrained to, so Claude could only pick from
// here instead of inventing arbitrary destinations. That constraint was
// reverted — Discover is open-ended again (see buildPrompt() in
// src/app/api/suggest-destinations/route.ts) — but this file is left in
// place in case that trade-off (narrower but more consistent/curated
// results) is ever worth revisiting. Safe to ignore or delete.
//
// Deliberately spans every Region/Interest/TravelStyle/BudgetLevel option
// on the Discover form — add more entries the same shape if a combination
// feels thin.
export const CURATED_DESTINATIONS: CuratedDestination[] = [
  // Asia
  {
    name: "Kyoto",
    country: "Japan",
    region: "Asia",
    interests: ["Culture", "History", "Food"],
    travelStyles: ["Cultural"],
    budgetLevels: ["Mid-range", "Luxury"],
  },
  {
    name: "Ubud",
    country: "Indonesia",
    region: "Asia",
    interests: ["Beaches", "Wellness", "Nature"],
    travelStyles: ["Relaxed", "Adventure"],
    budgetLevels: ["Budget", "Mid-range"],
  },
  {
    name: "Bangkok",
    country: "Thailand",
    region: "Asia",
    interests: ["Food", "Nightlife", "Culture", "Shopping"],
    travelStyles: ["Cultural", "Budget"],
    budgetLevels: ["Budget", "Mid-range"],
  },
  {
    name: "Hoi An",
    country: "Vietnam",
    region: "Asia",
    interests: ["Food", "History", "Culture"],
    travelStyles: ["Budget", "Cultural"],
    budgetLevels: ["Budget"],
  },
  {
    name: "Singapore",
    country: "Singapore",
    region: "Asia",
    interests: ["Food", "Shopping", "Cities"],
    travelStyles: ["Luxury", "Cultural"],
    budgetLevels: ["Mid-range", "Luxury"],
  },
  {
    name: "Seoul",
    country: "South Korea",
    region: "Asia",
    interests: ["Cities", "Food", "Shopping", "Nightlife"],
    travelStyles: ["Cultural"],
    budgetLevels: ["Mid-range"],
  },
  {
    name: "Pokhara",
    country: "Nepal",
    region: "Asia",
    interests: ["Mountains", "Adventure", "Nature"],
    travelStyles: ["Adventure"],
    budgetLevels: ["Budget"],
  },
  {
    name: "El Nido, Palawan",
    country: "Philippines",
    region: "Asia",
    interests: ["Beaches", "Nature", "Adventure"],
    travelStyles: ["Relaxed", "Adventure"],
    budgetLevels: ["Mid-range"],
  },
  {
    name: "Boracay",
    country: "Philippines",
    region: "Asia",
    interests: ["Beaches", "Nightlife"],
    travelStyles: ["Relaxed"],
    budgetLevels: ["Budget", "Mid-range"],
  },
  {
    name: "Chiang Mai",
    country: "Thailand",
    region: "Asia",
    interests: ["Wellness", "Culture", "Nature"],
    travelStyles: ["Relaxed", "Cultural"],
    budgetLevels: ["Budget"],
  },

  // Europe
  {
    name: "Lisbon",
    country: "Portugal",
    region: "Europe",
    interests: ["Culture", "Food", "Nightlife"],
    travelStyles: ["Cultural", "Budget"],
    budgetLevels: ["Budget", "Mid-range"],
  },
  {
    name: "Santorini",
    country: "Greece",
    region: "Europe",
    interests: ["Beaches", "Nature"],
    travelStyles: ["Relaxed", "Luxury"],
    budgetLevels: ["Luxury"],
  },
  {
    name: "Florence",
    country: "Italy",
    region: "Europe",
    interests: ["Culture", "History", "Food"],
    travelStyles: ["Cultural"],
    budgetLevels: ["Mid-range", "Luxury"],
  },
  {
    name: "Reykjavik",
    country: "Iceland",
    region: "Europe",
    interests: ["Nature", "Adventure"],
    travelStyles: ["Adventure"],
    budgetLevels: ["Mid-range", "Luxury"],
  },
  {
    name: "Barcelona",
    country: "Spain",
    region: "Europe",
    interests: ["Cities", "Culture", "Nightlife", "Food"],
    travelStyles: ["Cultural"],
    budgetLevels: ["Mid-range"],
  },
  {
    name: "Interlaken",
    country: "Switzerland",
    region: "Europe",
    interests: ["Mountains", "Adventure", "Nature"],
    travelStyles: ["Adventure", "Luxury"],
    budgetLevels: ["Luxury"],
  },
  {
    name: "Prague",
    country: "Czechia",
    region: "Europe",
    interests: ["History", "Culture", "Nightlife"],
    travelStyles: ["Cultural", "Budget"],
    budgetLevels: ["Budget", "Mid-range"],
  },
  {
    name: "Amalfi Coast",
    country: "Italy",
    region: "Europe",
    interests: ["Beaches", "Food"],
    travelStyles: ["Relaxed", "Luxury"],
    budgetLevels: ["Luxury"],
  },
  {
    name: "Istanbul",
    country: "Turkey",
    region: "Europe",
    interests: ["History", "Culture", "Food", "Shopping"],
    travelStyles: ["Cultural"],
    budgetLevels: ["Budget", "Mid-range"],
  },
  {
    name: "Copenhagen",
    country: "Denmark",
    region: "Europe",
    interests: ["Cities", "Culture", "Food"],
    travelStyles: ["Cultural", "Luxury"],
    budgetLevels: ["Luxury"],
  },

  // Americas
  {
    name: "Mexico City",
    country: "Mexico",
    region: "Americas",
    interests: ["Food", "Culture", "History"],
    travelStyles: ["Cultural"],
    budgetLevels: ["Budget", "Mid-range"],
  },
  {
    name: "Tulum",
    country: "Mexico",
    region: "Americas",
    interests: ["Beaches", "Wellness", "Nature"],
    travelStyles: ["Relaxed"],
    budgetLevels: ["Mid-range", "Luxury"],
  },
  {
    name: "Banff",
    country: "Canada",
    region: "Americas",
    interests: ["Mountains", "Nature", "Adventure"],
    travelStyles: ["Adventure"],
    budgetLevels: ["Mid-range", "Luxury"],
  },
  {
    name: "New York City",
    country: "United States",
    region: "Americas",
    interests: ["Cities", "Shopping", "Nightlife", "Food"],
    travelStyles: ["Cultural", "Luxury"],
    budgetLevels: ["Mid-range", "Luxury"],
  },
  {
    name: "Rio de Janeiro",
    country: "Brazil",
    region: "Americas",
    interests: ["Beaches", "Nightlife", "Nature"],
    travelStyles: ["Adventure", "Relaxed"],
    budgetLevels: ["Budget", "Mid-range"],
  },
  {
    name: "Cusco",
    country: "Peru",
    region: "Americas",
    interests: ["History", "Adventure", "Culture"],
    travelStyles: ["Adventure", "Cultural"],
    budgetLevels: ["Budget", "Mid-range"],
  },
  {
    name: "Arenal",
    country: "Costa Rica",
    region: "Americas",
    interests: ["Nature", "Adventure", "Wellness"],
    travelStyles: ["Adventure", "Relaxed"],
    budgetLevels: ["Mid-range"],
  },

  // Africa
  {
    name: "Marrakech",
    country: "Morocco",
    region: "Africa",
    interests: ["Culture", "Shopping", "History", "Food"],
    travelStyles: ["Cultural"],
    budgetLevels: ["Budget", "Mid-range"],
  },
  {
    name: "Cape Town",
    country: "South Africa",
    region: "Africa",
    interests: ["Nature", "Adventure", "Food", "Beaches"],
    travelStyles: ["Adventure", "Cultural"],
    budgetLevels: ["Mid-range"],
  },
  {
    name: "Zanzibar",
    country: "Tanzania",
    region: "Africa",
    interests: ["Beaches", "Nature", "Adventure"],
    travelStyles: ["Adventure", "Luxury"],
    budgetLevels: ["Luxury"],
  },
  {
    name: "Luxor",
    country: "Egypt",
    region: "Africa",
    interests: ["History", "Culture"],
    travelStyles: ["Cultural"],
    budgetLevels: ["Budget", "Mid-range"],
  },

  // Oceania
  {
    name: "Queenstown",
    country: "New Zealand",
    region: "Oceania",
    interests: ["Adventure", "Mountains", "Nature"],
    travelStyles: ["Adventure"],
    budgetLevels: ["Mid-range", "Luxury"],
  },
  {
    name: "Sydney",
    country: "Australia",
    region: "Oceania",
    interests: ["Cities", "Beaches", "Nightlife"],
    travelStyles: ["Cultural", "Relaxed"],
    budgetLevels: ["Mid-range", "Luxury"],
  },
  {
    name: "Nadi",
    country: "Fiji",
    region: "Oceania",
    interests: ["Beaches", "Wellness"],
    travelStyles: ["Relaxed", "Luxury"],
    budgetLevels: ["Luxury"],
  },
  {
    name: "Cairns",
    country: "Australia",
    region: "Oceania",
    interests: ["Nature", "Adventure", "Beaches"],
    travelStyles: ["Adventure"],
    budgetLevels: ["Mid-range"],
  },
  {
    name: "Dubai",
    country: "United Arab Emirates",
    region: "Asia",
    interests: ["Shopping", "Cities", "Nightlife"],
    travelStyles: ["Luxury"],
    budgetLevels: ["Luxury"],
  },
];
