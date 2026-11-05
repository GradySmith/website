import Link from "next/link";
import { RESOURCE_CATEGORIES } from "@/data/taxonomy";

export const metadata = { title: "Travel Resources — Grady Travels" };

export default function ResourcesPage() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
      <div>
        <h1 className="font-display text-4xl text-brand-teal-900">Travel Resources</h1>
        <p className="mt-2 text-brand-muted">Practical guides to help you plan.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {RESOURCE_CATEGORIES.map((category) => (
          <Link
            key={category.slug}
            href={`/resources/${category.slug}`}
            className="flex flex-col gap-1 rounded-2xl border border-brand-teal-100 bg-white p-6 transition-shadow hover:shadow-md"
          >
            <span className="font-display text-xl text-brand-teal-900">{category.name}</span>
            <span className="text-sm text-brand-muted">{category.description}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
