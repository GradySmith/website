import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Pencil, ExternalLink } from "lucide-react";
import { findCategory, findCountry } from "@/data/taxonomy";
import { formatPostDate, getPostBySlug, isBlogEditor, youtubeEmbedUrl } from "@/lib/posts";
import { bodyToHtml } from "@/lib/post-body";
import { sanitizePostHtml } from "@/lib/sanitize-post-html";
import { DeletePostButton } from "@/components/DeletePostButton";

export const dynamic = "force-dynamic";

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [post, isEditor] = await Promise.all([getPostBySlug(slug), isBlogEditor()]);

  if (!post || (!post.published && !isEditor)) notFound();

  const embedUrl = youtubeEmbedUrl(post.video_url);
  const bodyHtml = sanitizePostHtml(bodyToHtml(post.body));
  const countries = post.countries.map((s) => findCountry(s)).filter((c) => c !== undefined);
  const categories = post.categories.map((s) => findCategory(s)).filter((c) => c !== undefined);

  return (
    <article className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <Link
        href="/blog"
        className="flex w-fit items-center gap-1 text-sm text-brand-muted hover:text-brand-teal-700"
      >
        <ArrowLeft className="h-4 w-4" />
        All posts
      </Link>

      {post.cover_image_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={post.cover_image_url}
          alt={post.title}
          className="h-72 w-full rounded-3xl object-cover"
        />
      )}

      <header className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-4">
          <h1 className="font-display text-4xl text-brand-teal-900">{post.title}</h1>
          {isEditor && (
            <div className="flex flex-shrink-0 items-center gap-3 pt-2">
              <Link
                href={`/blog/${post.slug}/edit`}
                aria-label="Edit post"
                className="text-brand-muted hover:text-brand-teal-700"
              >
                <Pencil className="h-4 w-4" />
              </Link>
              <DeletePostButton id={post.id} title={post.title} iconOnly />
            </div>
          )}
        </div>
        <p className="text-sm text-brand-muted">{formatPostDate(post.created_at)}</p>
        <div className="flex flex-wrap gap-2">
          {countries.map((country) => (
            <Link
              key={country.slug}
              href={`/destinations/${country.slug}`}
              className="rounded-full bg-brand-teal-100 px-3 py-0.5 text-xs font-medium text-brand-teal-700 hover:bg-brand-teal-200"
            >
              {country.name}
            </Link>
          ))}
          {categories.map((category) => (
            <Link
              key={category.slug}
              href={`/resources/${category.slug}`}
              className="rounded-full bg-brand-mint-200 px-3 py-0.5 text-xs font-medium text-brand-teal-900 hover:bg-brand-mint-100"
            >
              {category.name}
            </Link>
          ))}
          {!post.published && (
            <span className="rounded-full bg-amber-100 px-3 py-0.5 text-xs font-medium text-amber-700">
              Draft — only editors can see this
            </span>
          )}
        </div>
        {post.subtitle && <p className="text-xl text-brand-muted">{post.subtitle}</p>}
      </header>

      {embedUrl ? (
        <div className="aspect-video w-full overflow-hidden rounded-2xl">
          <iframe
            src={embedUrl}
            title={`${post.title} video`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="h-full w-full"
          />
        </div>
      ) : (
        post.video_url && (
          <a
            href={post.video_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-fit items-center gap-2 rounded-full border border-brand-teal-200 px-4 py-2 text-sm font-medium text-brand-teal-700 hover:bg-brand-teal-50"
          >
            <ExternalLink className="h-4 w-4" />
            Watch the video
          </a>
        )
      )}

      <div className="post-body" dangerouslySetInnerHTML={{ __html: bodyHtml }} />
    </article>
  );
}
