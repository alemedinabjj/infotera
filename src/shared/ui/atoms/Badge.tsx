import type { ComponentProps, ReactNode } from "react";
import { cn } from "../../lib/cn";

type BadgeTone = "neutral" | "info" | "success" | "warning" | "danger";

const TONES: Record<BadgeTone, string> = {
  neutral: "bg-surface-sunken text-fg-muted",
  info: "bg-primary-soft text-primary",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
};

type BadgeProps = ComponentProps<"span"> & { tone?: BadgeTone; icon?: ReactNode };

/** Pílula de status. Não interativa; o texto já basta para leitores de tela. */
export const Badge = ({ tone = "neutral", icon, className, children, ...rest }: BadgeProps) => (
  <span
    className={cn(
      "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold",
      TONES[tone],
      className,
    )}
    {...rest}
  >
    {icon}
    {children}
  </span>
);
