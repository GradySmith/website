import { type LucideIcon } from "lucide-react";

interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  iconBgClassName?: string;
  iconColorClassName?: string;
}

export function FeatureCard({
  icon: Icon,
  title,
  iconBgClassName = "bg-brand-teal-100",
  iconColorClassName = "text-brand-teal-700",
}: FeatureCardProps) {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-brand-teal-100 bg-white p-5 shadow-sm">
      <span
        className={`flex h-11 w-11 items-center justify-center rounded-xl ${iconBgClassName} ${iconColorClassName}`}
      >
        <Icon className="h-5 w-5" strokeWidth={2} />
      </span>
      <p className="font-display text-lg font-semibold text-brand-ink">{title}</p>
    </div>
  );
}
