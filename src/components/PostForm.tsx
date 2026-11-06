"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { savePost, type SavePostState } from "@/app/blog/actions";
import { CoverImagePicker } from "@/components/CoverImagePicker";
import { RichTextEditor } from "@/components/RichTextEditor";
import { CONTINENTS, RESOURCE_CATEGORIES } from "@/data/taxonomy";
import { bodyToHtml } from "@/lib/post-body";
import { sanitizePostHtml } from "@/lib/sanitize-post-html";
import type { BlogPost } from "@/types";

const PILL_CLASS =
  "flex cursor-pointer items-center rounded-full border border-brand-teal-200 bg-white px-3.5 py-1.5 text-sm text-brand-ink transition-colors hover:bg-brand-teal-50 has-[:checked]:border-brand-teal-600 has-[:checked]:bg-brand-teal-600 has-[:checked]:text-white";

export function PostForm({ post }: { post?: BlogPost }) {
  const [state, formAction, isPending] = useActionState<SavePostState, FormData>(
    savePost,
    undefined
  );
  const [body, setBody] = useState(() => sanitizePostHtml(bodyToHtml(post?.body)));
  const initialBody = useRef(body);
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

  return (
    <form
      action={formAction}
      onChange={() => {
        dirty.current = true;
      }}
      onSubmit={() => {
        dirty.current = false;
      }}
      className="flex flex-col gap-6"
    >
      {post && <input type="hidden" name="id" value={post.id} />}
      <input type="hidden" name="body" value={body} />

      <CoverImagePicker initialUrl={post?.cover_image_url ?? null} />

      <div className="flex flex-col gap-3">
        <input
          name="title"
          required
          placeholder="Post title"
          defaultValue={post?.title}
          aria-label="Title"
          className="font-display w-full border-b border-brand-teal-100 bg-transparent pb-2 text-4xl text-brand-teal-900 outline-none placeholder:text-brand-teal-300 focus:border-brand-teal-500"
        />
        <input
          name="subtitle"
          placeholder="Subtitle (optional)"
          defaultValue={post?.subtitle ?? ""}
          aria-label="Subtitle"
          className="w-full border-b border-brand-teal-100 bg-transparent pb-2 text-xl text-brand-muted outline-none placeholder:text-brand-teal-300 focus:border-brand-teal-500"
        />
      </div>

      <label className="flex flex-col gap-1 text-sm text-brand-muted">
        Short summary (shown on post cards and in search results)
        <textarea name="summary" rows={2} defaultValue={post?.summary ?? ""} className="select-input" />
      </label>

      <div className="flex flex-col gap-1.5">
        <span className="text-sm text-brand-muted">Post</span>
        <RichTextEditor
          initialHtml={initialBody.current}
          onChange={(html) => {
            dirty.current = true;
            setBody(html);
          }}
        />
      </div>

      <label className="flex flex-col gap-1 text-sm text-brand-muted">
        Video link (optional — YouTube links show as an embedded video)
        <input
          name="video_url"
          type="url"
          placeholder="https://www.youtube.com/watch?v=…"
          defaultValue={post?.video_url ?? ""}
          className="select-input"
        />
      </label>

      <fieldset className="flex flex-col gap-3 rounded-2xl border border-brand-teal-100 bg-white p-4">
        <legend className="px-1 text-sm font-medium text-brand-ink">
          Destination tags (the post appears under that country in Destinations)
        </legend>
        {CONTINENTS.map((continent) => (
          <div key={continent.slug} className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-brand-muted">
              {continent.name}
            </span>
            <div className="flex flex-wrap gap-2">
              {continent.countries.map((country) => (
                <label key={country.slug} className={PILL_CLASS}>
                  <input
                    type="checkbox"
                    name="countries"
                    value={country.slug}
                    defaultChecked={post?.countries.includes(country.slug)}
                    className="sr-only"
                  />
                  {country.name}
                </label>
              ))}
            </div>
          </div>
        ))}
      </fieldset>

      <fieldset className="flex flex-col gap-2 rounded-2xl border border-brand-teal-100 bg-white p-4">
        <legend className="px-1 text-sm font-medium text-brand-ink">
          Travel resource tags (the post appears under that category in Travel Resources)
        </legend>
        <div className="flex flex-wrap gap-2">
          {RESOURCE_CATEGORIES.map((category) => (
            <label key={category.slug} className={PILL_CLASS}>
              <input
                type="checkbox"
                name="categories"
                value={category.slug}
                defaultChecked={post?.categories.includes(category.slug)}
                className="sr-only"
              />
              {category.name}
            </label>
          ))}
        </div>
      </fieldset>

      <details className="text-sm text-brand-muted">
        <summary className="cursor-pointer select-none">Advanced: web address of this post</summary>
        <label className="mt-2 flex flex-col gap-1">
          URL ending (leave blank to build it from the title)
          <input name="slug" defaultValue={post?.slug} className="select-input" />
        </label>
      </details>

      {state?.error && (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <div className="sticky bottom-0 -mx-2 flex flex-wrap items-center gap-3 rounded-2xl border border-brand-teal-100 bg-white/95 px-4 py-3 shadow-md backdrop-blur">
        {isPublished ? (
          <>
            <button
              type="submit"
              name="intent"
              value="keep"
              disabled={isPending}
              className="rounded-full bg-brand-teal-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-teal-700 disabled:opacity-60"
            >
              {isPending ? "Saving…" : "Save changes"}
            </button>
            <button
              type="submit"
              name="intent"
              value="draft"
              disabled={isPending}
              className="rounded-full border border-brand-teal-200 px-5 py-2.5 text-sm font-medium text-brand-teal-700 hover:bg-brand-teal-50 disabled:opacity-60"
            >
              Unpublish (back to draft)
            </button>
            <span className="text-xs text-brand-muted">This post is live.</span>
          </>
        ) : (
          <>
            <button
              type="submit"
              name="intent"
              value="draft"
              disabled={isPending}
              className="rounded-full border border-brand-teal-200 px-5 py-2.5 text-sm font-medium text-brand-teal-700 hover:bg-brand-teal-50 disabled:opacity-60"
            >
              {isPending ? "Saving…" : "Save draft"}
            </button>
            <button
              type="submit"
              name="intent"
              value="publish"
              disabled={isPending}
              className="rounded-full bg-brand-teal-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-teal-700 disabled:opacity-60"
            >
              Publish
            </button>
            <span className="text-xs text-brand-muted">Drafts are only visible to editors.</span>
          </>
        )}
      </div>
    </form>
  );
}
