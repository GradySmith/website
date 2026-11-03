import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, Lightbulb, Pencil, Trash2, ExternalLink } from "lucide-react";
import { getDestinationBySlug, isBlogOwner, youtubeEmbedUrl } from "@/lib/destinations";
import { deleteDestination } from "../actions";

export const dynamic = "force-dynamic";

export default async function DestinationPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [destination, isOwner] = await Promise.all([getDestinationBySlug(slug), isBlogOwner()]);

  if (!destination || (!destination.published && !isOwner)) notFound();

  const embedUrl = youtubeEmbedUrl(destination.video_url);
  const paragraphs = (destination.body ?? "").split(/\n\s*\n/).filter(Boolean);

  return (
    <article className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <Link
        href="/destinations"
        className="flex w-fit items-center gap-1 text-sm text-brand-muted hover:text-brand-teal-700"
      >
        <ArrowLeft className="h-4 w-4" />
        All destinations
      </Link>

      {destination.cover_image_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={destination.cover_image_url}
          alt={destination.name}
          className="h-72 w-full rounded-3xl object-cover"
        />
      )}

      <header className="flex flex-col gap-2">
        <div className="flex items-start justify-between gap-4">
          <h1 className="font-display text-4xl font-semibold text-brand-teal-900">
            {destination.name}
          </h1>
          {isOwner && (
            <div className="flex flex-shrink-0 items-center gap-3">
              <Link
                href={`/destinations/${destination.slug}/edit`}
                aria-label="Edit destination"
                className="text-brand-muted hover:text-brand-teal-700"
              >
                <Pencil className="h-4 w-4" />
              </Link>
              <form action={deleteDestination}>
                <input type="hidden" name="id" value={destination.id} />
                <button
                  type="submit"
                  aria-label="Delete destination"
                  className="text-brand-muted hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </form>
            </div>
          )}
        </div>
        {destination.country && <p className="text-brand-muted">{destination.country}</p>}
        {!destination.published && (
          <p className="w-fit rounded-full bg-amber-100 px-3 py-0.5 text-xs font-medium text-amber-700">
            Draft — only you can see this
          </p>
        )}
        {destination.summary && <p className="text-lg text-brand-ink">{destination.summary}</p>}
      </header>

      {embedUrl ? (
        <div className="aspect-video w-full overflow-hidden rounded-2xl">
          <iframe
            src={embedUrl}
            title={`${destination.name} video`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="h-full w-full"
          />
        </div>
      ) : (
        destination.video_url && (
          <a
            href={destination.video_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-fit items-center gap-2 rounded-full border border-brand-teal-200 px-4 py-2 text-sm font-medium text-brand-teal-700 hover:bg-brand-teal-50"
          >
            <ExternalLink className="h-4 w-4" />
            Watch the video
          </a>
        )
      )}

      {destination.best_time && (
        <p className="flex items-center gap-2 rounded-xl bg-brand-teal-50 px-4 py-3 text-sm text-brand-teal-800">
          <CalendarDays className="h-4 w-4" />
          Best time to visit: {destination.best_time}
        </p>
      )}

      <div className="flex flex-col gap-4 text-brand-ink">
        {paragraphs.map((paragraph, index) => (
          <p key={index} className="leading-relaxed">
            {paragraph}
          </p>
        ))}
      </div>

      {destination.tips.length > 0 && (
        <section className="flex flex-col gap-3 rounded-2xl border border-brand-teal-100 bg-white p-6">
          <h2 className="flex items-center gap-2 font-display text-xl font-semibold text-brand-ink">
            <Lightbulb className="h-5 w-5 text-brand-teal-600" />
            Tips
          </h2>
          <ul className="flex list-disc flex-col gap-2 pl-5 text-brand-ink">
            {destination.tips.map((tip, index) => (
              <li key={index}>{tip}</li>
            ))}
          </ul>
        </section>
      )}

      <Link
        href="/discover"
        className="w-fit rounded-full bg-brand-teal-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-teal-700"
      >
        Plan a trip like this
      </Link>
    </article>
  );
}
