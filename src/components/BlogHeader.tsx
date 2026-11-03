"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SITE } from "@/data/site";
import { signOut } from "@/app/login/actions";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/destinations", label: "Destinations" },
  { href: "/discover", label: "Trip Planner" },
];

export function BlogHeader({ userEmail }: { userEmail?: string }) {
  const pathname = usePathname();

  return (
    <header className="border-b border-brand-teal-100 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-4">
        <Link href="/" className="font-display text-xl font-semibold text-brand-teal-900">
          {SITE.name}
        </Link>
        <nav className="flex items-center gap-1">
          {LINKS.map(({ href, label }) => {
            const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-brand-teal-50 text-brand-teal-700"
                    : "text-brand-muted hover:text-brand-teal-700"
                }`}
              >
                {label}
              </Link>
            );
          })}
          {userEmail ? (
            <form action={signOut}>
              <button
                type="submit"
                className="rounded-full px-4 py-1.5 text-sm font-medium text-brand-muted hover:text-brand-teal-700"
              >
                Sign out
              </button>
            </form>
          ) : (
            <Link
              href="/login"
              className="rounded-full px-4 py-1.5 text-sm font-medium text-brand-muted hover:text-brand-teal-700"
            >
              Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
