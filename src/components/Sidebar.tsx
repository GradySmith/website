"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Compass,
  Map,
  Route,
  Ticket,
  Calendar,
  Wallet,
  LogOut,
} from "lucide-react";
import { Logo } from "./Logo";
import { signOut } from "@/app/login/actions";
import { usePreferences } from "@/lib/preferences-context";
import { t } from "@/lib/i18n";

const NAV_ITEMS = [
  { href: "/discover", key: "nav_discover" as const, icon: Compass },
  { href: "/trips", key: "nav_trips" as const, icon: Map },
  { href: "/map", key: "nav_map" as const, icon: Route },
  { href: "/bookings", key: "nav_bookings" as const, icon: Ticket },
  { href: "/calendar", key: "nav_calendar" as const, icon: Calendar },
  { href: "/budget", key: "nav_budget" as const, icon: Wallet },
];

export function Sidebar({ userEmail }: { userEmail?: string }) {
  const pathname = usePathname();
  const { locale } = usePreferences();

  return (
    <aside className="flex h-screen w-60 flex-shrink-0 flex-col justify-between border-r border-brand-teal-100 bg-brand-sidebar px-4 py-6">
      <div>
        <div className="px-2 pb-8">
          <Logo />
        </div>
        <nav className="flex flex-col gap-1">
          <Link
            href="/"
            className="mb-2 flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-brand-muted transition-colors hover:bg-white/60 hover:text-brand-teal-700"
          >
            <Home className="h-4 w-4" strokeWidth={2} />
            Back to blog
          </Link>
          <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-brand-muted">
            Trip Planner
          </p>
          {NAV_ITEMS.map(({ href, key, icon: Icon }) => {
            const isActive = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-white text-brand-teal-700 shadow-sm"
                    : "text-brand-muted hover:bg-white/60 hover:text-brand-teal-700"
                }`}
              >
                <Icon className="h-4 w-4" strokeWidth={2} />
                {t(locale, key)}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="flex flex-col gap-2">
        {userEmail && (
          <p className="truncate px-3 text-xs text-brand-muted" title={userEmail}>
            {userEmail}
          </p>
        )}
        <form action={signOut}>
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-brand-muted hover:bg-white/60 hover:text-brand-teal-700"
          >
            <LogOut className="h-4 w-4" strokeWidth={2} />
            {t(locale, "sign_out")}
          </button>
        </form>
      </div>
    </aside>
  );
}
