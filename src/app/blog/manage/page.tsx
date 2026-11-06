import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink, Pencil, Plus } from "lucide-react";
import { DeletePostButton } from "@/components/DeletePostButton";
import { findCategory, findCountry } from "@/data/taxonomy";
import { formatPostDate, getPosts, isBlogEditor } from "@/lib/posts";

export const metadata = { title: "Manage posts — Grady Travels" };
export const dynamic = "force-dynamic";

export default async function ManagePostsPage() {
  if (!(await isBlogEditor())) notFound();

  const posts = await getPosts({ includeDrafts: true });
  const drafts = posts.filter((post) => !post.published);
  const live = posts.filter((post) => post.published);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl text-brand-teal-900">Manage posts</h1>
          <p className="mt-2 text-brand-muted">
            Write, edit, publish and delete posts. Only editors can see this page.
          </p>
        </div>
        <Link
          href="/blog/new"
          className="flex flex-shrink-0 items-center gap-1.5 rounded-full bg-brand-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-teal-700"
        >
          <Plus className="h-4 w-4" />
          New post
        </Link>
      </div>

      {posts.length === 0 && (
        <p className="rounded-2xl border border-brand-teal-100 bg-white p-8 text-center text-brand-muted">
          No posts yet — click “New post” to write your first one.
        </p>
      )}

      {[
        { title: "Drafts", items: drafts },
        { title: "Published", items: live },
      ]
        .filter((group) => group.items.length > 0)
        .map((group) => (
          <section key={group.title} className="flex flex-col gap-3">
            <h2 className="font-display text-xl text-brand-ink">
              {group.title} ({group.items.length})
            </h2>
            <ul className="flex flex-col divide-y divide-brand-teal-100 overflow-hidden rounded-2xl border border-brand-teal-100 bg-white">
              {group.items.map((post) => {
                const tags = [
                  ...post.countries.map((slug) => findCountry(slug)?.name),
                  ...post.categories.map((slug) => findCategory(slug)?.name),
                ].filter(Boolean);
                return (
                  <li key={post.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <Link
                        href={`/blog/${post.slug}/edit`}
                        className="truncate font-medium text-brand-ink hover:text-brand-teal-700"
                      >
                        {post.title}
                      </Link>
                      <p className="truncate text-xs text-brand-muted">
                        {formatPostDate(post.created_at)}
                        {tags.length > 0 && ` · ${tags.join(", ")}`}
                      </p>
                    </div>
                    <div className="flex flex-shrink-0 items-center gap-4">
                      <Link
                        href={`/blog/${post.slug}/edit`}
                        className="flex items-center gap-1 text-sm text-brand-teal-700 hover:text-brand-teal-900"
                      >
                        <Pencil className="h-4 w-4" />
                        Edit
                      </Link>
                      <Link
                        href={`/blog/${post.slug}`}
                        className="flex items-center gap-1 text-sm text-brand-muted hover:text-brand-teal-700"
                      >
                        <ExternalLink className="h-4 w-4" />
                        {post.published ? "View" : "Preview"}
                      </Link>
                      <DeletePostButton id={post.id} title={post.title} />
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
    </div>
  );
}
