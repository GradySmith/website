"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, ChevronRight } from "lucide-react";
import { SITE } from "@/data/site";
import { Logo } from "@/components/Logo";
import { CONTINENTS, RESOURCE_CATEGORIES } from "@/data/taxonomy";
import { signOut } from "@/app/login/actions";

const TAB_CLASS =
  "flex items-center gap-1 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors";
const ACTIVE_CLASS = "bg-brand-teal-50 text-brand-teal-700";
const IDLE_CLASS = "text-brand-muted hover:text-brand-teal-700";

const PANEL_CLASS =
  "min-w-48 rounded-2xl border border-brand-teal-100 bg-white p-1.5 shadow-lg";
const ITEM_CLASS =
  "flex items-center justify-between gap-6 rounded-xl px-3 py-2 text-sm text-brand-ink hover:bg-brand-teal-50 hover:text-brand-teal-700";

export function BlogHeader({ userEmail }: { userEmail?: string }) {
  const pathname = usePathname();
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
  const tab = (href: string) => `${TAB_CLASS} ${isActive(href) ? ACTIVE_CLASS : IDLE_CLASS}`;

  return (
    <header className="relative z-40 border-b border-brand-teal-100 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-6 py-3">
        <Link href="/" aria-label={SITE.name}>
          <Logo size={40} />
        </Link>

        <nav className="flex flex-wrap items-center gap-0.5">
          <Link href="/" className={tab("/")}>
            Home
          </Link>

          {/* Destinations → continent → country (fly-out menus, pure CSS hover) */}
          <div className="group relative">
            <Link href="/destinations" className={tab("/destinations")}>
              Destinations
              <ChevronDown className="h-3.5 w-3.5" />
            </Link>
            <div className="invisible absolute left-0 top-full z-50 pt-2 opacity-0 transition-opacity group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
              <div className={PANEL_CLASS}>
                {CONTINENTS.map((continent) => (
                  <div key={continent.slug} className="group/sub relative">
                    <Link href={`/destinations#${continent.slug}`} className={ITEM_CLASS}>
                      {continent.name}
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                    <div className="invisible absolute left-full top-0 pl-1.5 opacity-0 transition-opacity group-focus-within/sub:visible group-focus-within/sub:opacity-100 group-hover/sub:visible group-hover/sub:opacity-100">
                      <div className={PANEL_CLASS}>
                        {continent.countries.map((country) => (
                          <Link
                            key={country.slug}
                            href={`/destinations/${country.slug}`}
                            className={ITEM_CLASS}
                          >
                            {country.name}
                          </Link>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <Link href="/blog" className={tab("/blog")}>
            Blog
          </Link>

          <div className="group relative">
            <Link href="/resources" className={tab("/resources")}>
              Travel Resources
              <ChevronDown className="h-3.5 w-3.5" />
            </Link>
            <div className="invisible absolute left-0 top-full z-50 pt-2 opacity-0 transition-opacity group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
              <div className={PANEL_CLASS}>
                {RESOURCE_CATEGORIES.map((category) => (
                  <Link
                    key={category.slug}
                    href={`/resources/${category.slug}`}
                    className={ITEM_CLASS}
                  >
                    {category.name}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          <Link href="/discover" className={tab("/discover")}>
            Trip Planner
          </Link>
          <Link href="/about" className={tab("/about")}>
            About me
          </Link>

          {userEmail ? (
            <form action={signOut}>
              <button type="submit" className={`${TAB_CLASS} ${IDLE_CLASS}`}>
                Sign out
              </button>
            </form>
          ) : (
            <Link href="/login" className={`${TAB_CLASS} ${IDLE_CLASS}`}>
              Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
