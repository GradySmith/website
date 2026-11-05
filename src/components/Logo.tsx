import { SITE } from "@/data/site";

// Hummingbird badge + site name. The mark is /public/logo.svg (also used
// as the browser-tab icon via src/app/icon.svg).
export function Logo({ withWordmark = true, size = 36 }: { withWordmark?: boolean; size?: number }) {
  return (
    <div className="flex items-center gap-2.5">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo.svg" alt={SITE.name} width={size} height={size} className="flex-shrink-0" />
      {withWordmark && (
        <span className="font-display text-xl text-brand-teal-900">{SITE.name}</span>
      )}
    </div>
  );
}
