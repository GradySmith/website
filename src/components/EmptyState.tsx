import { type LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
}

export function EmptyState({ icon: Icon, title, description }: EmptyStateProps) {
  return (
    <div className="mx-auto flex max-w-3xl flex-col items-center gap-3 rounded-3xl border border-dashed border-brand-teal-200 bg-white px-8 py-20 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-teal-100 text-brand-teal-700">
        <Icon className="h-6 w-6" strokeWidth={2} />
      </span>
      <h1 className="font-display text-2xl font-semibold text-brand-ink">
        {title}
      </h1>
      <p className="max-w-sm text-sm text-brand-muted">{description}</p>
    </div>
  );
}
