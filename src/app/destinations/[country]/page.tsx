import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PostGrid } from "@/components/PostGrid";
import { findContinentOf, findCountry } from "@/data/taxonomy";
import { getPosts } from "@/lib/posts";

export const dynamic = "force-dynamic";

export default async function CountryPage({ params }: { params: Promise<{ country: string }> }) {
  const { country: countrySlug } = await params;
  const country = findCountry(countrySlug);
  if (!country) notFound();

  const continent = findContinentOf(countrySlug);
  const posts = await getPosts({ country: countrySlug });

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
      <div className="flex flex-col gap-2">
        <Link
          href="/destinations"
          className="flex w-fit items-center gap-1 text-sm text-brand-muted hover:text-brand-teal-700"
        >
          <ArrowLeft className="h-4 w-4" />
          All destinations
        </Link>
        <h1 className="font-display text-4xl text-brand-teal-900">{country.name}</h1>
        {continent && <p className="text-brand-muted">{continent.name}</p>}
      </div>

      <PostGrid posts={posts} />
    </div>
  );
}
