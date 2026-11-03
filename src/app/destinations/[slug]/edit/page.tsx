import { notFound } from "next/navigation";
import { DestinationForm } from "@/components/DestinationForm";
import { getDestinationBySlug, isBlogOwner } from "@/lib/destinations";

export default async function EditDestinationPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [destination, isOwner] = await Promise.all([getDestinationBySlug(slug), isBlogOwner()]);
  if (!destination || !isOwner) notFound();

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <h1 className="font-display text-3xl font-semibold text-brand-teal-900">
        Edit {destination.name}
      </h1>
      <DestinationForm destination={destination} />
    </div>
  );
}
