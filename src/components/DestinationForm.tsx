"use client";

import { useActionState } from "react";
import { saveDestination, type SaveDestinationState } from "@/app/destinations/actions";
import type { BlogDestination } from "@/types";

export function DestinationForm({ destination }: { destination?: BlogDestination }) {
  const [state, formAction, isPending] = useActionState<SaveDestinationState, FormData>(
    saveDestination,
    undefined
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {destination && <input type="hidden" name="id" value={destination.id} />}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm text-brand-muted">
          Name
          <input name="name" required defaultValue={destination?.name} className="select-input" />
        </label>
        <label className="flex flex-col gap-1 text-sm text-brand-muted">
          Country
          <input name="country" defaultValue={destination?.country ?? ""} className="select-input" />
        </label>
        <label className="flex flex-col gap-1 text-sm text-brand-muted">
          URL slug (optional)
          <input
            name="slug"
            defaultValue={destination?.slug}
            placeholder="auto from name"
            className="select-input"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-brand-muted">
          Best time to visit
          <input name="best_time" defaultValue={destination?.best_time ?? ""} className="select-input" />
        </label>
        <label className="flex flex-col gap-1 text-sm text-brand-muted">
          Cover image URL
          <input
            name="cover_image_url"
            type="url"
            defaultValue={destination?.cover_image_url ?? ""}
            className="select-input"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-brand-muted">
          Video link (YouTube, TikTok, Instagram)
          <input
            name="video_url"
            type="url"
            defaultValue={destination?.video_url ?? ""}
            className="select-input"
          />
        </label>
      </div>

      <label className="flex flex-col gap-1 text-sm text-brand-muted">
        Short summary
        <textarea
          name="summary"
          rows={2}
          defaultValue={destination?.summary ?? ""}
          className="select-input"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm text-brand-muted">
        Story (blank line between paragraphs)
        <textarea name="body" rows={10} defaultValue={destination?.body ?? ""} className="select-input" />
      </label>

      <label className="flex flex-col gap-1 text-sm text-brand-muted">
        Tips (one per line)
        <textarea
          name="tips"
          rows={5}
          defaultValue={destination?.tips?.join("\n") ?? ""}
          className="select-input"
        />
      </label>

      <label className="flex items-center gap-2 text-sm text-brand-ink">
        <input type="checkbox" name="published" defaultChecked={destination?.published ?? true} />
        Published (visible to visitors)
      </label>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={isPending}
        className="w-fit rounded-full bg-brand-teal-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-teal-700 disabled:opacity-60"
      >
        {isPending ? "Saving..." : destination ? "Save changes" : "Publish destination"}
      </button>
    </form>
  );
}
