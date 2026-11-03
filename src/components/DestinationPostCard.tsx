import Link from "next/link";
import { MapPin } from "lucide-react";
import type { BlogDestination } from "@/types";

export function DestinationPostCard({ destination }: { destination: BlogDestination }) {
  return (
    <Link
      href={`/destinations/${destination.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-brand-teal-100 bg-white transition-shadow hover:shadow-md"
    >
      <div className="h-44 w-full overflow-hidden bg-brand-teal-50">
        {destination.cover_image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={destination.cover_image_url}
            alt={destination.name}
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-brand-teal-300">
            <MapPin className="h-8 w-8" strokeWidth={1.5} />
          </div>
        )}
      </div>
      <div className="flex flex-col gap-1 p-4">
        <h3 className="font-display text-lg font-semibold text-brand-ink">{destination.name}</h3>
        {destination.country && <p className="text-xs text-brand-muted">{destination.country}</p>}
        {destination.summary && (
          <p className="mt-1 line-clamp-2 text-sm text-brand-muted">{destination.summary}</p>
        )}
      </div>
    </Link>
  );
}
