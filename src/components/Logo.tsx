import Image from "next/image";

export function Logo({ withWordmark = true }: { withWordmark?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span className="block h-9 w-9 overflow-hidden rounded-xl">
        <Image
          src="/logo-hummingbird.png"
          alt="Biyahe"
          width={72}
          height={72}
          className="h-full w-full object-cover"
          priority
        />
      </span>
      {withWordmark && (
        <span className="font-display text-xl font-semibold text-brand-teal-900">
          Biyahe
        </span>
      )}
    </div>
  );
}
