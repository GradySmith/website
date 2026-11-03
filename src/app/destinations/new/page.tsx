import { notFound } from "next/navigation";
import { DestinationForm } from "@/components/DestinationForm";
import { isBlogOwner } from "@/lib/destinations";

export default async function NewDestinationPage() {
  if (!(await isBlogOwner())) notFound();

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <h1 className="font-display text-3xl font-semibold text-brand-teal-900">Add a destination</h1>
      <DestinationForm />
    </div>
  );
}
