"use client";

import { useRef, useState } from "react";
import { ImagePlus, Trash2 } from "lucide-react";
import { uploadBlogImage } from "@/lib/image-upload";

// Upload (or replace/remove) a post's cover photo. Submits its URL through a
// hidden `cover_image_url` input.
export function CoverImagePicker({ initialUrl }: { initialUrl: string | null }) {
  const [url, setUrl] = useState(initialUrl ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      setUrl(await uploadBlogImage(file));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
            <input type="hidden" name="cover_image_url" value={url} />

      {url ? (
        <div className="relative overflow-hidden rounded-3xl">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt="Cover preview" className="h-72 w-full object-cover" />
          <div className="absolute right-3 top-3 flex gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={busy}
              className="rounded-full bg-white/90 px-3 py-1.5 text-xs font-medium text-brand-teal-700 shadow hover:bg-white disabled:opacity-60"
            >
              {busy ? "Uploading…" : "Replace"}
            </button>
            <button
              type="button"
              onClick={() => setUrl("")}
              aria-label="Remove cover photo"
              className="rounded-full bg-white/90 p-1.5 text-brand-muted shadow hover:bg-white hover:text-red-600"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="flex h-40 w-full flex-col items-center justify-center gap-2 rounded-3xl border-2 border-dashed border-brand-teal-200 bg-white text-sm text-brand-teal-700 transition-colors hover:bg-brand-teal-50 disabled:opacity-60"
        >
          <ImagePlus className="h-6 w-6" />
          {busy ? "Uploading…" : "Add a cover photo (shown at the top of the post and on cards)"}
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(event) => {
          void handleFile(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
