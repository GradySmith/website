"use client";

// Vision-based sibling to GmailSyncPanel: since Airbnb and Hostelworld
// don't offer a public API for a traveler to connect their own account
// (their APIs are for hosts/property managers only), this lets the user
// upload a screenshot of their "My Trips" page instead. Claude reads the
// bookings off the image and stages them in detected_bookings exactly
// like a Gmail scan does, so they show up in the same review list below.

import { useRef, useState, useTransition } from "react";
import { Camera, RefreshCw, X } from "lucide-react";
import { PillButton } from "./PillButton";
import { scanBookingScreenshots, type ScreenshotImageInput } from "@/app/bookings/actions";

const MAX_IMAGES = 6;
const MAX_FILE_BYTES = 8 * 1024 * 1024; // 8MB per image

interface PendingImage {
  id: string;
  name: string;
  mediaType: string;
  base64: string;
  previewUrl: string;
}

function readFileAsPendingImage(file: File): Promise<PendingImage> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error("Couldn't read file"));
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
      resolve({
        id: `${file.name}-${file.size}-${Math.random().toString(36).slice(2)}`,
        name: file.name,
        mediaType: file.type,
        base64,
        previewUrl: dataUrl,
      });
    };
    reader.readAsDataURL(file);
  });
}

export function ScreenshotUploadPanel() {
  const [images, setImages] = useState<PendingImage[]>([]);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFilesSelected(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    setMessage(null);
    setError(null);

    const files = Array.from(fileList);

    const nonImage = files.find((file) => !file.type.startsWith("image/"));
    if (nonImage) {
      setError(`${nonImage.name} isn't an image.`);
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    const tooBig = files.find((file) => file.size > MAX_FILE_BYTES);
    if (tooBig) {
      setError(`${tooBig.name} is too large — screenshots must be under 8MB each.`);
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    try {
      const pending = await Promise.all(files.map(readFileAsPendingImage));
      setImages((prev) => [...prev, ...pending].slice(0, MAX_IMAGES));
    } catch {
      setError("Couldn't read one of those files. Try again.");
    }

    if (inputRef.current) inputRef.current.value = "";
  }

  function removeImage(id: string) {
    setImages((prev) => prev.filter((image) => image.id !== id));
  }

  function handleScan() {
    if (images.length === 0) {
      setError("Add at least one screenshot first.");
      return;
    }
    setMessage(null);
    setError(null);

    const payload: ScreenshotImageInput[] = images.map((image) => ({
      base64: image.base64,
      mediaType: image.mediaType,
    }));

    startTransition(async () => {
      const result = await scanBookingScreenshots(payload);
      if (result.success) {
        setMessage(
          result.data.found > 0
            ? `Found ${result.data.found} booking${result.data.found === 1 ? "" : "s"} — review ${result.data.found === 1 ? "it" : "them"} below.`
            : "Didn't spot any bookings in that screenshot. Try a clearer or more complete one."
        );
        setImages([]);
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-brand-teal-100 bg-white p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-brand-ink">
            <Camera className="h-4 w-4 text-brand-teal-600" />
            Scan a screenshot
          </h2>
          <p className="mt-1 text-sm text-brand-muted">
            No direct Hostelworld or Airbnb connection exists yet — but upload a screenshot of
            your &quot;My Trips&quot; page and the planner will read the bookings off it.
          </p>
          {message && <p className="mt-1 text-sm text-emerald-700">{message}</p>}
          {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
        </div>
        <div className="flex flex-shrink-0 items-center gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/gif,image/webp"
            multiple
            onChange={(event) => handleFilesSelected(event.target.files)}
            className="hidden"
            id="screenshot-upload-input"
          />
          <label
            htmlFor="screenshot-upload-input"
            className="cursor-pointer rounded-full border border-brand-teal-200 bg-white px-6 py-3 text-sm font-medium text-brand-teal-700 transition-colors hover:bg-brand-teal-50"
          >
            Choose screenshot{images.length > 0 ? "s" : ""}
          </label>
        </div>
      </div>

      {images.length > 0 && (
        <div className="flex flex-col gap-3 rounded-xl border border-dashed border-brand-teal-200 bg-brand-teal-50/40 p-4">
          <div className="flex flex-wrap gap-3">
            {images.map((image) => (
              <div
                key={image.id}
                className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg border border-brand-teal-200"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image.previewUrl} alt={image.name} className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeImage(image.id)}
                  aria-label={`Remove ${image.name}`}
                  className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
                >
                  <X className="h-3 w-3" strokeWidth={2.5} />
                </button>
              </div>
            ))}
          </div>
          <PillButton
            type="button"
            variant="primary"
            onClick={handleScan}
            disabled={isPending}
            className="self-start"
          >
            <RefreshCw className={`h-4 w-4 ${isPending ? "animate-spin" : ""}`} />
            {isPending
              ? "Scanning..."
              : `Scan ${images.length} screenshot${images.length === 1 ? "" : "s"}`}
          </PillButton>
        </div>
      )}
    </div>
  );
}
