// Purely decorative photo marquee for the Home page — two rows of
// destination photos drifting right to left under a dark overlay. No
// interactivity, so this stays a plain (Server Component-friendly)
// function; the animation is pure CSS (see .animate-marquee in
// globals.css). Rendered full-bleed by its caller (src/app/page.tsx).

const MIN_TRACK_LENGTH = 10;
// Home passes up to 40 photos — capped here so a single row never balloons
// past ~30 <img> tags (40 photos padded-then-doubled could otherwise mean
// 80+ images in one row), which is wasted DOM/network weight for a purely
// decorative strip.
const MAX_SOURCE_PHOTOS = 15;

// Repeats a short photo list up to a minimum length (so a user with only
// 1-2 saved trips still gets a full-looking strip), then duplicates the
// whole thing once more so the CSS loop has an identical second half to
// scroll into — see the animation comment in globals.css.
function buildTrack(source: string[]): string[] {
  const capped = source.slice(0, MAX_SOURCE_PHOTOS);
  const padded: string[] = [];
  while (padded.length < MIN_TRACK_LENGTH) {
    padded.push(...capped);
  }
  return [...padded, ...padded];
}

function PhotoRow({
  photos,
  animationClassName,
}: {
  photos: string[];
  animationClassName: string;
}) {
  return (
    // bg-black + a hairline gap is what draws the thin black seam between
    // photos, instead of a border or rounded-corner "tile" look.
    <div className={`flex w-max gap-px bg-black ${animationClassName}`}>
      {photos.map((url, index) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={index}
          src={url}
          alt=""
          loading="lazy"
          className="h-16 w-24 flex-shrink-0 object-cover sm:h-20 sm:w-32"
        />
      ))}
    </div>
  );
}

export function DestinationBanner({ photos }: { photos: string[] }) {
  if (photos.length === 0) return null;

  const rowA = buildTrack(photos);
  const rowB = buildTrack([...photos].reverse());

  return (
    <div aria-hidden="true" className="relative overflow-hidden bg-black">
      {/* Same hairline treatment between the two rows as between photos. */}
      <div className="flex flex-col gap-px bg-black">
        <PhotoRow photos={rowA} animationClassName="animate-marquee" />
        <PhotoRow photos={rowB} animationClassName="animate-marquee-slow" />
      </div>

      {/* Slightly dark/faded look over the whole strip */}
      <div className="pointer-events-none absolute inset-0 bg-black/45" />
    </div>
  );
}
