// Pure helpers for the video and map blocks in blog posts. Used by the editor
// (to turn what you paste into an embeddable address), by the sanitizer (to
// allow only known-safe embed sources) and by the page renderer.

// Returns a YouTube embed URL for a watch/short/youtu.be link, else null.
export function youtubeEmbedUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url.trim());
    let id: string | null = null;
    if (parsed.hostname === "youtu.be") id = parsed.pathname.slice(1);
    else if (parsed.hostname.endsWith("youtube.com")) {
      if (parsed.pathname === "/watch") id = parsed.searchParams.get("v");
      else if (parsed.pathname.startsWith("/shorts/") || parsed.pathname.startsWith("/embed/")) {
        id = parsed.pathname.split("/")[2] ?? null;
      }
    }
    return id && /^[A-Za-z0-9_-]{6,20}$/.test(id) ? `https://www.youtube.com/embed/${id}` : null;
  } catch {
    return null;
  }
}

export function isAllowedVideoUrl(url: string): boolean {
  return /^https:\/\/www\.youtube(-nocookie)?\.com\/embed\/[A-Za-z0-9_-]{6,20}$/.test(url);
}

// Only these map providers can be embedded.
export function isAllowedMapUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return false;
    const host = parsed.hostname;
    const path = parsed.pathname;
    if (host === "www.google.com" || host === "google.com") {
      if (path.startsWith("/maps/embed") || path.startsWith("/maps/d/embed")) return true;
      return path === "/maps" && parsed.searchParams.get("output") === "embed";
    }
    if (host === "www.openstreetmap.org") return path.startsWith("/export/embed.html");
    if (host === "stay22.com" || host === "www.stay22.com" || host === "embed.stay22.com") {
      return path.startsWith("/embed/") || path.startsWith("/allez/");
    }
    return false;
  } catch {
    return false;
  }
}

// Turns whatever the editor pastes into a map address we can embed:
//  - a place name, e.g. "Kel Suu Lake, Kyrgyzstan"
//  - a Google My Maps share link (great for accommodation maps)
//  - a Google Maps / OpenStreetMap / Stay22 "embed" link, or the whole
//    <iframe …> embed code
// Returns null when it can't be embedded.
export function normalizeMapInput(input: string): string | null {
  let value = input.trim();
  if (!value) return null;

  const iframeSrc = value.match(/<iframe[^>]*\ssrc=["']([^"']+)["']/i);
  if (iframeSrc) value = iframeSrc[1].replace(/&amp;/g, "&");

  if (!/^https?:\/\//i.test(value)) {
    return `https://www.google.com/maps?q=${encodeURIComponent(value)}&output=embed`;
  }

  try {
    const parsed = new URL(value);
    const host = parsed.hostname.replace(/^www\./, "");

    // My Maps share link → its embed version.
    if (host === "google.com" && parsed.pathname.startsWith("/maps/d/")) {
      const mid = parsed.searchParams.get("mid");
      if (mid) return `https://www.google.com/maps/d/embed?mid=${encodeURIComponent(mid)}`;
    }

    // A normal Google Maps place link → embed that place by name.
    if (host === "google.com" && parsed.pathname.startsWith("/maps/place/")) {
      const name = decodeURIComponent(parsed.pathname.split("/")[3] ?? "").replace(/\+/g, " ");
      if (name) return `https://www.google.com/maps?q=${encodeURIComponent(name)}&output=embed`;
    }
  } catch {
    return null;
  }

  return isAllowedMapUrl(value) ? value : null;
}
