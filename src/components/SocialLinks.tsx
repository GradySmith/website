import { Youtube, Instagram } from "lucide-react";
import { SITE } from "@/data/site";

// lucide has no TikTok mark, so it's drawn inline.
function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M16.6 2h-3.2v13.2a2.9 2.9 0 1 1-2.9-2.9c.3 0 .6 0 .9.1V9.1a6.1 6.1 0 1 0 5.2 6V8.6a7.9 7.9 0 0 0 4.6 1.5V6.9a4.8 4.8 0 0 1-4.6-4.9z" />
    </svg>
  );
}

const LINKS = [
  { key: "youtube", label: "YouTube", handle: "@grady_travels", icon: Youtube, url: SITE.socials.youtube },
  { key: "tiktok", label: "TikTok", handle: "@grady.travels", icon: TikTokIcon, url: SITE.socials.tiktok },
  { key: "instagram", label: "Instagram", handle: "@grady.travels", icon: Instagram, url: SITE.socials.instagram },
].filter((link) => Boolean(link.url));

export function SocialLinks() {
  if (LINKS.length === 0) return null;

  return (
    <div className="flex items-center justify-center gap-4">
      {LINKS.map(({ key, label, handle, icon: Icon, url }) => (
        <a
          key={key}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${label} (${handle})`}
          title={`${label} ${handle}`}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-teal-100 text-brand-teal-700 transition-colors hover:bg-brand-teal-600 hover:text-white"
        >
          <Icon className="h-5 w-5" />
        </a>
      ))}
    </div>
  );
}
