import type { DestinationSuggestionBase } from "@/types";

// Hand-written, always-available trip ideas shown on the Discover page
// below the AI matching tool (src/app/discover/page.tsx) — for anyone who
// wants a starting point without filling out the form. Same shape as what
// Claude returns from suggest_destinations, so these render through the
// exact same <DestinationCard> and "Plan this trip" flow.
export const POPULAR_ITINERARIES: DestinationSuggestionBase[] = [
  {
    name: "Paris",
    country: "France",
    pronunciation: "PAIR-iss",
    summary:
      "Paris pairs grand boulevards and gilded museums with unhurried café mornings and " +
      "golden-hour views from the Seine. Wherever you point yourself — the Louvre, a hidden " +
      "wine bar, a bakery queue — there's a version of the city that feels made for you.",
    highlights: [
      "Sunset views from the Eiffel Tower",
      "Wandering the Louvre's endless halls",
      "Croissant crawls through Left Bank bakeries",
      "Boat rides along the Seine at dusk",
    ],
    bestTimeToVisit: "April-June and September-October",
    estimatedBudgetPerPerson: "$1,800-2,600",
  },
  {
    name: "London",
    country: "United Kingdom",
    pronunciation: "LUHN-dun",
    summary:
      "London moves between centuries in a single afternoon — royal parks and palaces give " +
      "way to buzzing markets, world-class theatre, and some of the best museums on Earth, " +
      "most of them free to walk into.",
    highlights: [
      "Browsing Borough Market's food stalls",
      "West End theatre on a weeknight",
      "Free galleries at the British Museum",
      "River walks past Tower Bridge",
    ],
    bestTimeToVisit: "May-September",
    estimatedBudgetPerPerson: "$1,900-2,700",
  },
  {
    name: "Bangkok",
    country: "Thailand",
    pronunciation: "BANG-kok",
    summary:
      "Bangkok runs on contrast: gilded temple spires rise beside neon night markets, and a " +
      "five-star spa can sit two blocks from a street stall serving the best pad kra pao of " +
      "your life.",
    highlights: [
      "Street food crawls through Chinatown at night",
      "Temple hopping at Wat Arun and Wat Pho",
      "Boat rides along the Chao Phraya River",
      "Rooftop bars over the city skyline",
    ],
    bestTimeToVisit: "November-February",
    estimatedBudgetPerPerson: "$900-1,400",
  },
  {
    name: "Istanbul",
    country: "Turkey",
    pronunciation: "ISS-tan-bool",
    summary:
      "Istanbul straddles two continents and centuries of empires — a skyline of minarets " +
      "and domes gives way to bustling bazaars, Bosphorus ferries, and tea served on every " +
      "corner.",
    highlights: [
      "Getting lost in the Grand Bazaar",
      "Touring the Hagia Sophia and Blue Mosque",
      "Bosphorus ferry rides between continents",
      "Turkish breakfast spreads that last for hours",
    ],
    bestTimeToVisit: "April-May and September-October",
    estimatedBudgetPerPerson: "$1,000-1,600",
  },
  {
    name: "New York City",
    country: "United States",
    pronunciation: "noo YORK SIH-tee",
    summary:
      "New York City packs a planet's worth of food, art, and energy into a handful of " +
      "boroughs — Broadway stages, world-class museums, and a different neighborhood " +
      "personality on every subway stop.",
    highlights: [
      "Broadway shows on a Saturday night",
      "Gallery hopping through Chelsea",
      "Bagel and pizza slice comparisons",
      "Sunset from a rooftop bar in Brooklyn",
    ],
    bestTimeToVisit: "April-June and September-November",
    estimatedBudgetPerPerson: "$2,200-3,200",
  },
  {
    name: "Rome",
    country: "Italy",
    pronunciation: "ROHM",
    summary:
      "Rome turns every walk into a history lesson — ancient ruins sit beside baroque " +
      "fountains and trattorias serving pasta recipes generations old, all within a single " +
      "afternoon's wandering.",
    highlights: [
      "Sunrise at the Colosseum before the crowds",
      "Tossing a coin into the Trevi Fountain",
      "Long, unhurried pasta dinners",
      "Wandering the Vatican Museums",
    ],
    bestTimeToVisit: "April-May and September-October",
    estimatedBudgetPerPerson: "$1,600-2,300",
  },
  {
    name: "Tokyo",
    country: "Japan",
    pronunciation: "TOH-kyoh",
    summary:
      "Tokyo layers centuries-old shrines beneath a skyline of neon and glass — a single day " +
      "can carry you from a quiet temple garden to the sensory overload of Shibuya Crossing.",
    highlights: [
      "Early morning at Senso-ji Temple",
      "Sushi breakfast at Tsukiji Outer Market",
      "Neon nights in Shinjuku and Shibuya",
      "Cherry blossoms in Ueno Park (in season)",
    ],
    bestTimeToVisit: "March-May and October-November",
    estimatedBudgetPerPerson: "$1,700-2,500",
  },
  {
    name: "Barcelona",
    country: "Spain",
    pronunciation: "bar-suh-LOH-nuh",
    summary:
      "Barcelona mixes Gaudí's surreal architecture with Mediterranean beaches and late-night " +
      "tapas culture — a city built for wandering without much of a plan.",
    highlights: [
      "Touring Gaudí's Sagrada Família",
      "Tapas hopping through the Gothic Quarter",
      "Afternoons on Barceloneta Beach",
      "Sunset views from Park Güell",
    ],
    bestTimeToVisit: "May-June and September",
    estimatedBudgetPerPerson: "$1,300-1,900",
  },
];
