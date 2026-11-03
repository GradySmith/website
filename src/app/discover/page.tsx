import { DiscoverForm } from "@/components/DiscoverForm";
import { PopularItinerariesCarousel } from "@/components/PopularItinerariesCarousel";
import { createClient } from "@/lib/supabase-server";
import { getDestinationPhotos } from "@/lib/destination-photos";
import { POPULAR_ITINERARIES } from "@/data/popular-itineraries";
import { getServerPreferences } from "@/lib/preferences";
import { t } from "@/lib/i18n";
import type { DestinationSuggestion } from "@/types";

export default async function DiscoverPage() {
  const supabase = await createClient();

  // Always-available trip ideas below the AI tool — photos come through
  // the same cache-then-fetch path as everything else, so this is instant
  // after the first-ever load populates the cache. Falls back to photo-less
  // cards (PhotoCarousel/DestinationCard both handle an empty array fine)
  // instead of taking the whole page down if Pexels/Openverse/Supabase hit
  // a snag — same defensive shape as Home's getBannerPhotos().
  const [popularWithPhotos, { locale }] = await Promise.all([
    Promise.all(
      POPULAR_ITINERARIES.map(async (destination): Promise<DestinationSuggestion> => {
        try {
          return {
            ...destination,
            photos: await getDestinationPhotos(supabase, destination.name, destination.country),
          };
        } catch (error) {
          console.error(`Photo fetch failed for ${destination.name}:`, error);
          return { ...destination, photos: [] };
        }
      })
    ),
    getServerPreferences(),
  ]);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <DiscoverForm />

      <section className="flex flex-col gap-4 border-t border-brand-teal-100 pt-8">
        <div>
          <h2 className="font-display text-xl font-semibold text-brand-ink">
            {t(locale, "discover_popular_heading")}
          </h2>
          <p className="mt-1 text-sm text-brand-muted">
            {t(locale, "discover_popular_subheading")}
          </p>
        </div>
        <PopularItinerariesCarousel destinations={popularWithPhotos} />
      </section>
    </div>
  );
}
