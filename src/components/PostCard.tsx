import Link from "next/link";
import { MapPin } from "lucide-react";
import { findCountry } from "@/data/taxonomy";
import { formatPostDate } from "@/lib/posts";
import type { BlogPost } from "@/types";

export function PostCard({ post }: { post: BlogPost }) {
  const countryNames = post.countries
    .map((slug) => findCountry(slug)?.name)
    .filter((name): name is string => Boolean(name));

  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-brand-teal-100 bg-white transition-shadow hover:shadow-md"
    >
      <div className="h-44 w-full overflow-hidden bg-brand-teal-50">
        {post.cover_image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={post.cover_image_url}
            alt={post.title}
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-brand-teal-300">
            <MapPin className="h-8 w-8" strokeWidth={1.5} />
          </div>
        )}
      </div>
      <div className="flex flex-col gap-1.5 p-4">
        <p className="text-xs text-brand-muted">
          {formatPostDate(post.created_at)}
          {countryNames.length > 0 && ` · ${countryNames.join(", ")}`}
        </p>
        <h3 className="font-display text-lg text-brand-ink">{post.title}</h3>
        {post.summary && <p className="line-clamp-2 text-sm text-brand-muted">{post.summary}</p>}
      </div>
    </Link>
  );
}
