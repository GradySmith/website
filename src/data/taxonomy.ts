// The tags a blog post can carry. Menus, country pages and the post form
// are all built from this file — to add a country or a continent, add it
// here (slug = lowercase, hyphenated, used in the URL).

export interface CountryTag {
  slug: string;
  name: string;
}

export interface ContinentTag {
  slug: string;
  name: string;
  countries: CountryTag[];
}

export const CONTINENTS: ContinentTag[] = [
  {
    slug: "asia",
    name: "Asia",
    countries: [{ slug: "japan", name: "Japan" }],
  },
  {
    slug: "europe",
    name: "Europe",
    countries: [
      { slug: "iceland", name: "Iceland" },
      { slug: "poland", name: "Poland" },
      { slug: "ukraine", name: "Ukraine" },
    ],
  },
  {
    slug: "south-america",
    name: "South America",
    countries: [
      { slug: "peru", name: "Peru" },
      { slug: "brazil", name: "Brazil" },
    ],
  },
];

export interface ResourceCategory {
  slug: string;
  name: string;
  description: string;
}

export const RESOURCE_CATEGORIES: ResourceCategory[] = [
  {
    slug: "itineraries",
    name: "Itineraries",
    description: "Day-by-day plans you can copy for your own trip.",
  },
  {
    slug: "entry-visa-requirements",
    name: "Entry/Visa Requirements",
    description: "What you need to get into each country.",
  },
];

export const ALL_COUNTRIES: CountryTag[] = CONTINENTS.flatMap((continent) => continent.countries);

export function findCountry(slug: string): CountryTag | undefined {
  return ALL_COUNTRIES.find((country) => country.slug === slug);
}

export function findContinentOf(countrySlug: string): ContinentTag | undefined {
  return CONTINENTS.find((continent) => continent.countries.some((c) => c.slug === countrySlug));
}

export function findCategory(slug: string): ResourceCategory | undefined {
  return RESOURCE_CATEGORIES.find((category) => category.slug === slug);
}
