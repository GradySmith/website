"use client";

// Overlay button on a trip's cover image (Overview tab) that opens a small
// picker: choose from the same cached destination photos used elsewhere in
// the app, or paste a custom image URL.

import { useState, useTransition } from "react";
import { Camera, X, Check } from "lucide-react";
import { getTripPhotoOptions, updateTripCoverPhoto } from "@/app/trips/actions";

export function EditTripPhotoButton({ tripId }: { tripId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [photos, setPhotos] = useState<string[] | null>(null);
  const [isLoadingPhotos, setIsLoadingPhotos] = useState(false);
  const [customUrl, setCustomUrl] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function open() {
    setIsOpen(true);
    setError(null);

    if (photos === null) {
      setIsLoadingPhotos(true);
      const result = await getTripPhotoOptions(tripId);
      setIsLoadingPhotos(false);

      if (result.success) {
        setPhotos(result.data.photos);
      } else {
        setPhotos([]);
        setError(result.error);
      }
    }
  }

  function choosePhoto(url: string) {
    startTransition(async () => {
      const result = await updateTripCoverPhoto({ tripId, coverImageUrl: url });
      if (result.success) {
        setIsOpen(false);
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={open}
        className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1.5 text-xs font-medium text-white backdrop-blur transition-colors hover:bg-black/75"
      >
        <Camera className="h-3.5 w-3.5" strokeWidth={2} />
        Change photo
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold text-brand-ink">
                Change trip photo
              </h2>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Close"
                className="text-brand-muted hover:text-brand-ink"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {isLoadingPhotos ? (
              <p className="mt-4 text-sm text-brand-muted">Loading photos...</p>
            ) : photos && photos.length > 0 ? (
              <div className="mt-4 grid grid-cols-3 gap-2">
                {photos.map((url) => (
                  <button
                    key={url}
                    type="button"
                    onClick={() => choosePhoto(url)}
                    disabled={isPending}
                    className="aspect-square overflow-hidden rounded-lg border-2 border-transparent transition-colors hover:border-brand-teal-400 disabled:opacity-60"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm text-brand-muted">
                No suggested photos found — paste a URL below instead.
              </p>
            )}

            <div className="mt-4 flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-brand-muted">
                Or paste an image URL
              </label>
              <div className="flex gap-2">
                <input
                  value={customUrl}
                  onChange={(event) => setCustomUrl(event.target.value)}
                  placeholder="https://..."
                  className="select-input flex-1"
                />
                <button
                  type="button"
                  onClick={() => customUrl.trim() && choosePhoto(customUrl.trim())}
                  disabled={isPending || !customUrl.trim()}
                  aria-label="Use this URL"
                  className="flex items-center justify-center rounded-full bg-brand-teal-600 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-brand-teal-700 disabled:opacity-60"
                >
                  <Check className="h-4 w-4" strokeWidth={2} />
                </button>
              </div>
            </div>

            {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
          </div>
        </div>
      )}
    </>
  );
}
