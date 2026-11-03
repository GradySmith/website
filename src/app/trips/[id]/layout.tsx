import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MapPin } from "lucide-react";
import { TripTitleEditor } from "@/components/TripTitleEditor";
import { TripTabs } from "@/components/TripTabs";
import { getTrip } from "@/lib/get-trip";

export default async function TripLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const trip = await getTrip(id);

  if (!trip) {
    notFound();
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <div className="flex flex-col gap-4">
        <Link
          href="/trips"
          className="inline-flex w-fit items-center gap-1 text-sm text-brand-muted hover:text-brand-teal-700"
        >
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2} />
          My Trips
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="flex items-center gap-1 text-sm text-brand-muted">
              <MapPin className="h-3.5 w-3.5" />
              {trip.destination}
            </p>
            <div className="mt-1">
              <TripTitleEditor
                tripId={id}
                title={trip.title}
                destination={trip.destination}
                status={trip.status}
              />
            </div>
          </div>
        </div>

        <TripTabs tripId={id} />
      </div>

      {children}
    </div>
  );
}
