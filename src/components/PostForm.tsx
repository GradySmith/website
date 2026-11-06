"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { ExternalLink } from "lucide-react";
import { savePost, type SavePostState } from "@/app/blog/actions";
import { CoverImagePicker } from "@/components/CoverImagePicker";
import { RichTextEditor } from "@/components/RichTextEditor";
import { CONTINENTS, RESOURCE_CATEGORIES, findCategory, findCountry } from "@/data/taxonomy";
import { bodyToHtml } from "@/lib/post-body";
import { sanitizePostHtml } from "@/lib/sanitize-post-html";
import type { BlogPost } from "@/types";

const PILL_BASE =
  "rounded-full border px-3 py-1 text-sm transition-colors";
const PILL_OFF = "border-brand-teal-200 bg-white text-brand-ink hover:bg-brand-teal-50";
const PILL_ON = "border-brand-teal-600 bg-brand-teal-600 text-white";

function toggle(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

// The post editor. The left column is laid out exactly like the public post
// page (cover, title, subtitle, body) so you write on the real thing; the
// right column holds publishing buttons, tags and other settings.
export function PostForm({ post }: { post?: BlogPost }) {
  const [state, formAction, isPending] = useActionState<SavePostState, FormData>(
    savePost,
    undefined
  );
  const [body, setBody] = useState(() => sanitizePostHtml(bodyToHtml(post?.body)));
  const initialBody = useRef(body);
  const [countries, setCountries] = useState<string[]>(post?.countries ?? []);
  const [categories, setCategories] = useState<string[]>(post?.categories ?? []);
  const dirty = useRef(false);

  // Warn before leaving the page with unsaved writing.
  useEffect(() => {
    function warn(event: BeforeUnloadEvent) {
      if (!dirty.current) return;
      event.preventDefault();
    }
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);

  const isPublished = post?.published ?? false;
  const countryTags = countries.map((slug) => findCountry(slug)).filter((c) => c !== undefined);
  const categoryTags = categories.map((slug) => findCategory(slug)).filter((c) => c !== undefined);

  return (
    <form
      action={formAction}
      onChange={() => {
        dirty.current = true;
      }}
      onSubmit={() => {
        dirty.current = false;
      }}
      className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,48rem)_17rem] lg:justify-center"
    >
      {post && <input type="hidden" name="id" value={post.id} />}
      <input type="hidden" name="body" value={body} />
      {countries.map((slug) => (
        <input key={slug} type="hidden" name="countries" value={slug} />
      ))}
      {categories.map((slug) => (
        <input key={slug} type="hidden" name="categories" value={slug} />
      ))}

      {/* ---- The post, as visitors will see it ---- */}
      <article className="flex min-w-0 flex-col gap-6">
        <CoverImagePicker initialUrl={post?.cover_image_url ?? null} />

        <header className="flex flex-col gap-3">
          <input
            name="title"
            required
            placeholder="Post title"
            defaultValue={post?.title}
            aria-label="Title"
            className="font-display w-full bg-transparent text-4xl text-brand-teal-900 outline-none placeholder:text-brand-teal-300"
          />
          <input
            name="subtitle"
            placeholder="Subtitle (optional)"
            defaultValue={post?.subtitle ?? ""}
            aria-label="Subtitle"
            className="w-full bg-transparent text-xl text-brand-muted outline-none placeholder:text-brand-teal-300"
          />
          <div className="flex flex-wrap items-center gap-2">
            {countryTags.map((country) => (
              <span
                key={country.slug}
                className="rounded-full bg-brand-teal-100 px-3 py-0.5 text-xs font-medium text-brand-teal-700"
              >
                {country.name}
              </span>
            ))}
            {categoryTags.map((category) => (
              <span
                key={category.slug}
                className="rounded-full bg-brand-mint-200 px-3 py-0.5 text-xs font-medium text-brand-teal-900"
              >
                {category.name}
              </span>
            ))}
            {countryTags.length + categoryTags.length === 0 && (
              <span className="text-xs text-brand-teal-500">Pick tags in the panel →</span>
            )}
          </div>
        </header>

        <RichTextEditor
          initialHtml={initialBody.current}
          onChange={(html) => {
            dirty.current = true;
            setBody(html);
          }}
        />
      </article>

      {/* ---- Settings ---- */}
      <aside className="flex flex-col gap-5 self-start lg:sticky lg:top-6">
        <div className="flex flex-col gap-3 rounded-2xl border border-brand-teal-100 bg-white p-4">
          <p className="text-sm font-medium text-brand-ink">
            {isPublished ? "Live on your blog" : post ? "Draft" : "New post"}
          </p>
          {isPublished ? (
            <>
              <button
                type="submit"
                name="intent"
                value="keep"
                disabled={isPending}
                className="rounded-full bg-brand-teal-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-teal-700 disabled:opacity-60"
              >
                {isPending ? "Saving…" : "Save changes"}
              </button>
              <button
                type="submit"
                name="intent"
                value="draft"
                disabled={isPending}
                className="rounded-full border border-brand-teal-200 px-5 py-2 text-sm font-medium text-brand-teal-700 hover:bg-brand-teal-50 disabled:opacity-60"
              >
                Unpublish (back to draft)
              </button>
            </>
          ) : (
            <>
              <button
                type="submit"
                name="intent"
                value="publish"
                disabled={isPending}
                className="rounded-full bg-brand-teal-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-teal-700 disabled:opacity-60"
              >
                {isPending ? "Saving…" : "Publish"}
              </button>
              <button
                type="submit"
                name="intent"
                value="draft"
                disabled={isPending}
                className="rounded-full border border-brand-teal-200 px-5 py-2 text-sm font-medium text-brand-teal-700 hover:bg-brand-teal-50 disabled:opacity-60"
              >
                Save draft
              </button>
            </>
          )}
          {post && (
            <Link
              href={`/blog/${post.slug}`}
              className="flex items-center gap-1.5 text-sm text-brand-muted hover:text-brand-teal-700"
            >
              <ExternalLink className="h-4 w-4" />
              {post.published ? "View live post" : "Preview saved draft"}
            </Link>
          )}
          {state?.error && (
            <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
              {state.error}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-3 rounded-2xl border border-brand-teal-100 bg-white p-4">
          <p className="text-sm font-medium text-brand-ink">Destination tags</p>
          {CONTINENTS.map((continent) => (
            <div key={continent.slug} className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-brand-muted">
                {continent.name}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {continent.countries.map((country) => {
                  const on = countries.includes(country.slug);
                  return (
                    <button
                      key={country.slug}
                      type="button"
                      aria-pressed={on}
                      onClick={() => {
                        dirty.current = true;
                        setCountries((list) => toggle(list, country.slug));
                      }}
                      className={`${PILL_BASE} ${on ? PILL_ON : PILL_OFF}`}
                    >
                      {country.name}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-2 rounded-2xl border border-brand-teal-100 bg-white p-4">
          <p className="text-sm font-medium text-brand-ink">Travel resource tags</p>
          <div className="flex flex-wrap gap-1.5">
            {RESOURCE_CATEGORIES.map((category) => {
              const on = categories.includes(category.slug);
              return (
                <button
                  key={category.slug}
                  type="button"
                  aria-pressed={on}
                  onClick={() => {
                    dirty.current = true;
                    setCategories((list) => toggle(list, category.slug));
                  }}
                  className={`${PILL_BASE} ${on ? PILL_ON : PILL_OFF}`}
                >
                  {category.name}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col gap-3 rounded-2xl border border-brand-teal-100 bg-white p-4">
          <label className="flex flex-col gap-1 text-sm text-brand-muted">
            Short summary
            <span className="text-xs">Shown on post cards and in search results.</span>
            <textarea name="summary" rows={3} defaultValue={post?.summary ?? ""} className="select-input" />
          </label>
          <label className="flex flex-col gap-1 text-sm text-brand-muted">
            Featured video link
            <span className="text-xs">Optional. Shows above the post. (To put a video inside the post, use Add → Video.)</span>
            <input
              name="video_url"
              type="url"
              placeholder="https://www.youtube.com/watch?v=…"
              defaultValue={post?.video_url ?? ""}
              className="select-input"
            />
          </label>
          <details className="text-sm text-brand-muted">
            <summary className="cursor-pointer select-none">Advanced: web address</summary>
            <label className="mt-2 flex flex-col gap-1">
              URL ending (blank = made from the title)
              <input name="slug" defaultValue={post?.slug} className="select-input" />
            </label>
          </details>
        </div>
      </aside>
    </form>
  );
}
