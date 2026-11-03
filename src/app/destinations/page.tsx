import Link from "next/link";
import { Plus, MapPin } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { DestinationPostCard } from "@/components/DestinationPostCard";
import { getPublishedDestinations, isBlogOwner } from "@/lib/destinations";

export const metadata = { title: "Destinations — Grady Travels" };
export const dynamic = "force-dynamic";

export default async function DestinationsPage() {
  const [destinations, isOwner] = await Promise.all([getPublishedDestinations(), isBlogOwner()]);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-semibold text-brand-teal-900">Destinations</h1>
          <p className="mt-2 text-brand-muted">Everywhere I&apos;ve been and shared so far.</p>
        </div>
        {isOwner && (
          <Link
            href="/destinations/new"
            className="flex items-center gap-1.5 rounded-full bg-brand-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-teal-700"
          >
            <Plus className="h-4 w-4" />
            Add destination
          </Link>
        )}
      </div>

      {destinations.length === 0 ? (
        <EmptyState
          icon={MapPin}
          title="Destinations coming soon"
          description="New places are on the way — check back shortly."
        />
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {destinations.map((destination) => (
            <DestinationPostCard key={destination.id} destination={destination} />
          ))}
        </div>
      )}
    </div>
  );
}
