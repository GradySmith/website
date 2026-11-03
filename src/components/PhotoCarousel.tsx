"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, ImageOff } from "lucide-react";
import type { DestinationPhoto } from "@/types";

export function PhotoCarousel({
  photos,
  alt,
}: {
  photos: DestinationPhoto[];
  alt: string;
}) {
  const [index, setIndex] = useState(0);

  if (photos.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center rounded-xl bg-brand-teal-50 text-brand-teal-300">
        <ImageOff className="h-8 w-8" strokeWidth={1.5} />
      </div>
    );
  }

  const photo = photos[index];

  function goToPrevious(event: React.MouseEvent) {
    event.stopPropagation();
    setIndex((current) => (current - 1 + photos.length) % photos.length);
  }

  function goToNext(event: React.MouseEvent) {
    event.stopPropagation();
    setIndex((current) => (current + 1) % photos.length);
  }

  return (
    <div className="relative h-48 overflow-hidden rounded-xl bg-brand-teal-50">
      {/* Photos come from a couple of different source domains (Pexels,
          Openverse), so a plain <img> is used instead of next/image
          (which would need every domain allow-listed in next.config.ts). */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photo.thumbnailUrl}
        alt={alt}
        className="h-full w-full object-cover"
        loading="lazy"
      />

      {photos.length > 1 && (
        <>
          <button
            type="button"
            onClick={goToPrevious}
            aria-label="Previous photo"
            className="absolute left-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-brand-ink shadow-sm hover:bg-white"
          >
            <ChevronLeft className="h-4 w-4" strokeWidth={2} />
          </button>
          <button
            type="button"
            onClick={goToNext}
            aria-label="Next photo"
            className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-brand-ink shadow-sm hover:bg-white"
          >
            <ChevronRight className="h-4 w-4" strokeWidth={2} />
          </button>

          <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1">
            {photos.map((_, dotIndex) => (
              <span
                key={dotIndex}
                className={`h-1.5 w-1.5 rounded-full transition-colors ${
                  dotIndex === index ? "bg-white" : "bg-white/50"
                }`}
              />
            ))}
          </div>
        </>
      )}

      {/* Attribution — Pexels doesn't require credit, but Openverse photos
          are usually Creative Commons licensed and do, so always show it. */}
      <a
        href={photo.sourceUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="absolute bottom-1.5 right-2 rounded bg-black/45 px-1.5 py-0.5 text-[10px] leading-none text-white hover:bg-black/65"
      >
        Photo: {photo.creator}
        {photo.license ? ` · ${photo.license}` : ""}
      </a>
    </div>
  );
}
