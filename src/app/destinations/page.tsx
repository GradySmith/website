import Link from "next/link";
import { CONTINENTS } from "@/data/taxonomy";

export const metadata = { title: "Destinations — Grady Travels" };

export default function DestinationsPage() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-10">
      <div>
        <h1 className="font-display text-4xl text-brand-teal-900">Destinations</h1>
        <p className="mt-2 text-brand-muted">Pick a country to see everything I&apos;ve written about it.</p>
      </div>

      {CONTINENTS.map((continent) => (
        <section key={continent.slug} id={continent.slug} className="flex scroll-mt-24 flex-col gap-4">
          <h2 className="font-display text-2xl text-brand-ink">{continent.name}</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {continent.countries.map((country) => (
              <Link
                key={country.slug}
                href={`/destinations/${country.slug}`}
                className="rounded-2xl border border-brand-teal-100 bg-white px-5 py-4 font-display text-lg text-brand-teal-900 transition-shadow hover:shadow-md"
              >
                {country.name}
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
