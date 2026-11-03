import Image from "next/image";

// Loading state for anything waiting on Claude (currently just Discover's
// "Suggest destinations") — a thin track with the Biyahe hummingbird logo
// sweeping left to right on a loop, standing in for a normal progress bar
// since there's no real percentage to report. Animation is pure CSS, see
// .animate-loading-hummingbird in globals.css.
export function LoadingHummingbird({ label }: { label?: string }) {
  return (
    <div className="mx-auto flex max-w-xs flex-col items-center gap-3 py-6">
      <div className="relative h-6 w-full">
        <div className="absolute left-0 right-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-brand-teal-50" />
        <div className="absolute top-1/2 h-6 w-6 -translate-y-1/2 animate-loading-hummingbird">
          <Image
            src="/logo-hummingbird.png"
            alt=""
            width={48}
            height={48}
            className="h-full w-full rounded-full object-cover"
          />
        </div>
      </div>
      {label && <p className="text-sm text-brand-muted">{label}</p>}
    </div>
  );
}
