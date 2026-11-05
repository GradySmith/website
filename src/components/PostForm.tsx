"use client";

import { useActionState } from "react";
import { savePost, type SavePostState } from "@/app/blog/actions";
import { CONTINENTS, RESOURCE_CATEGORIES } from "@/data/taxonomy";
import type { BlogPost } from "@/types";

export function PostForm({ post }: { post?: BlogPost }) {
  const [state, formAction, isPending] = useActionState<SavePostState, FormData>(
    savePost,
    undefined
  );

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {post && <input type="hidden" name="id" value={post.id} />}

      <label className="flex flex-col gap-1 text-sm text-brand-muted">
        Title
        <input name="title" required defaultValue={post?.title} className="select-input" />
      </label>

      <label className="flex flex-col gap-1 text-sm text-brand-muted">
        Short summary
        <textarea name="summary" rows={2} defaultValue={post?.summary ?? ""} className="select-input" />
      </label>

      <label className="flex flex-col gap-1 text-sm text-brand-muted">
        Post (blank line between paragraphs)
        <textarea name="body" rows={12} defaultValue={post?.body ?? ""} className="select-input" />
      </label>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm text-brand-muted">
          Cover image URL
          <input
            name="cover_image_url"
            type="url"
            defaultValue={post?.cover_image_url ?? ""}
            className="select-input"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-brand-muted">
          Video link (YouTube shows embedded)
          <input
            name="video_url"
            type="url"
            defaultValue={post?.video_url ?? ""}
            className="select-input"
          />
        </label>
      </div>

      <fieldset className="flex flex-col gap-3 rounded-xl border border-brand-teal-100 bg-white p-4">
        <legend className="px-1 text-sm font-medium text-brand-ink">
          Countries (shows the post under Destinations)
        </legend>
        {CONTINENTS.map((continent) => (
          <div key={continent.slug} className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-brand-muted">
              {continent.name}
            </span>
            <div className="flex flex-wrap gap-x-5 gap-y-1.5">
              {continent.countries.map((country) => (
                <label key={country.slug} className="flex items-center gap-2 text-sm text-brand-ink">
                  <input
                    type="checkbox"
                    name="countries"
                    value={country.slug}
                    defaultChecked={post?.countries.includes(country.slug)}
                  />
                  {country.name}
                </label>
              ))}
            </div>
          </div>
        ))}
      </fieldset>

      <fieldset className="flex flex-col gap-2 rounded-xl border border-brand-teal-100 bg-white p-4">
        <legend className="px-1 text-sm font-medium text-brand-ink">
          Travel resources (shows the post under Travel Resources)
        </legend>
        <div className="flex flex-wrap gap-x-5 gap-y-1.5">
          {RESOURCE_CATEGORIES.map((category) => (
            <label key={category.slug} className="flex items-center gap-2 text-sm text-brand-ink">
              <input
                type="checkbox"
                name="categories"
                value={category.slug}
                defaultChecked={post?.categories.includes(category.slug)}
              />
              {category.name}
            </label>
          ))}
        </div>
      </fieldset>

      <label className="flex flex-col gap-1 text-sm text-brand-muted">
        URL ending (optional — made from the title if blank)
        <input name="slug" defaultValue={post?.slug} className="select-input" />
      </label>

      <label className="flex items-center gap-2 text-sm text-brand-ink">
        <input type="checkbox" name="published" defaultChecked={post?.published ?? true} />
        Published (visible to visitors)
      </label>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={isPending}
        className="w-fit rounded-full bg-brand-teal-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-teal-700 disabled:opacity-60"
      >
        {isPending ? "Saving..." : post ? "Save changes" : "Publish post"}
      </button>
    </form>
  );
}
