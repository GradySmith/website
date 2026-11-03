import { type ButtonHTMLAttributes } from "react";

interface PillButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary";
}

export function PillButton({
  variant = "primary",
  className = "",
  children,
  ...props
}: PillButtonProps) {
  const base =
    "inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-medium transition-colors";
  const styles =
    variant === "primary"
      ? "bg-brand-teal-600 text-white hover:bg-brand-teal-700"
      : "bg-white text-brand-teal-700 border border-brand-teal-200 hover:bg-brand-teal-50";

  return (
    <button className={`${base} ${styles} ${className}`} {...props}>
      {children}
    </button>
  );
}
