import Link from "next/link";
import { Youtube, Instagram, Music2, ArrowRight } from "lucide-react";
import { DestinationPostCard } from "@/components/DestinationPostCard";
import { SITE } from "@/data/site";
import { getPublishedDestinations, youtubeEmbedUrl } from "@/lib/destinations";

export const dynamic = "force-dynamic";

const SOCIAL_LINKS = [
  { key: "youtube", label: "YouTube", icon: Youtube, url: SITE.socials.youtube },
  { key: "instagram", label: "Instagram", icon: Instagram, url: SITE.socials.instagram },
  { key: "tiktok", label: "TikTok", icon: Music2, url: SITE.socials.tiktok },
].filter((social) => Boolean(social.url));

export default async function HomePage() {
  const destinations = await getPublishedDestinations(12);
  const featured = destinations.slice(0, 3);
  const videos = destinations
    .map((destination) => ({
      destination,
      embedUrl: youtubeEmbedUrl(destination.video_url),
    }))
    .filter((entry): entry is typeof entry & { embedUrl: string } => Boolean(entry.embedUrl))
    .slice(0, 3);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-14">
      <section className="grid grid-cols-1 items-center gap-8 rounded-3xl bg-gradient-to-br from-brand-teal-100 via-brand-teal-50 to-brand-mint-200 px-8 py-14 md:grid-cols-[1fr_auto]">
        <div className="flex flex-col gap-5">
          <p className="text-sm font-semibold uppercase tracking-wide text-brand-teal-700">
            {SITE.name}
          </p>
          <h1 className="font-display text-5xl font-semibold text-brand-teal-900">
            {SITE.about.heading}
          </h1>
          <p className="font-hand text-3xl">{SITE.tagline}</p>
          {SITE.about.paragraphs.map((paragraph, index) => (
            <p key={index} className="max-w-xl text-brand-muted">
              {paragraph}
            </p>
          ))}
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/destinations"
              className="inline-flex items-center gap-2 rounded-full bg-brand-teal-600 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-brand-teal-700"
            >
              Explore destinations
              <ArrowRight className="h-4 w-4" />
            </Link>
            {SOCIAL_LINKS.map(({ key, label, icon: Icon, url }) => (
              <a
                key={key}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-brand-teal-200 bg-white px-4 py-3 text-sm font-medium text-brand-teal-700 hover:bg-brand-teal-50"
              >
                <Icon className="h-4 w-4" />
                {label}
              </a>
            ))}
          </div>
        </div>
        {SITE.about.photoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={SITE.about.photoUrl}
            alt="Grady"
            className="h-56 w-56 rounded-3xl object-cover shadow-md"
          />
        )}
      </section>

      <section className="flex flex-col gap-5">
        <div className="flex items-end justify-between">
          <h2 className="font-display text-2xl font-semibold text-brand-ink">
            Featured destinations
          </h2>
          <Link
            href="/destinations"
            className="text-sm font-medium text-brand-teal-700 hover:text-brand-teal-800"
          >
            See all
          </Link>
        </div>
        {featured.length === 0 ? (
          <p className="text-brand-muted">New destinations are coming soon.</p>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            {featured.map((destination) => (
              <DestinationPostCard key={destination.id} destination={destination} />
            ))}
          </div>
        )}
      </section>

      {videos.length > 0 && (
        <section className="flex flex-col gap-5">
          <h2 className="font-display text-2xl font-semibold text-brand-ink">Latest videos</h2>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            {videos.map(({ destination, embedUrl }) => (
              <div key={destination.id} className="flex flex-col gap-2">
                <div className="aspect-video overflow-hidden rounded-2xl">
                  <iframe
                    src={embedUrl}
                    title={`${destination.name} video`}
                    loading="lazy"
                    allowFullScreen
                    className="h-full w-full"
                  />
                </div>
                <Link
                  href={`/destinations/${destination.slug}`}
                  className="text-sm font-medium text-brand-ink hover:text-brand-teal-700"
                >
                  {destination.name}
                </Link>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="flex flex-col items-start gap-3 rounded-3xl border border-brand-teal-100 bg-white p-8">
        <h2 className="font-display text-2xl font-semibold text-brand-ink">Planning your own trip?</h2>
        <p className="max-w-xl text-brand-muted">
          Use the Trip Planner to brainstorm destinations with AI, build an itinerary, and keep
          your bookings in one place.
        </p>
        <Link
          href="/discover"
          className="rounded-full bg-brand-teal-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-teal-700"
        >
          Open the Trip Planner
        </Link>
      </section>
    </div>
  );
}
