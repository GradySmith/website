"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function TripTabs({ tripId }: { tripId: string }) {
  const pathname = usePathname();

  const tabs = [
    { href: `/trips/${tripId}`, label: "Overview" },
    { href: `/trips/${tripId}/itinerary`, label: "Itinerary" },
    { href: `/trips/${tripId}/transportation`, label: "Flights/Transportation" },
    { href: `/trips/${tripId}/budget`, label: "Budget" },
    { href: `/trips/${tripId}/map`, label: "Map" },
  ];

  return (
    <nav className="flex gap-1 border-b border-brand-teal-100">
      {tabs.map((tab) => {
        const isActive = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              isActive
                ? "border-brand-teal-600 text-brand-teal-700"
                : "border-transparent text-brand-muted hover:text-brand-teal-700"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
