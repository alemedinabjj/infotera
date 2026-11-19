import type { ComponentProps, ReactNode } from "react";
import { cn } from "../../lib/cn";

type IconButtonVariant = "ghost" | "secondary" | "overlay";

const VARIANTS: Record<IconButtonVariant, string> = {
  ghost: "text-fg-muted hover:bg-surface-sunken hover:text-fg",
  secondary: "border border-border-strong bg-surface text-fg hover:bg-surface-sunken",
  overlay: "bg-surface/90 text-fg shadow-card hover:bg-surface",
};

type IconButtonProps = Omit<ComponentProps<"button">, "aria-label" | "children"> & {
  /** Obrigatório: o botão não tem texto visível. */
  "aria-label": string;
  icon: ReactNode;
  variant?: IconButtonVariant;
};

/** Botão só com ícone, alvo de toque 44x44. */
export const IconButton = ({
  icon,
  variant = "ghost",
  type = "button",
  className,
  ...rest
}: IconButtonProps) => (
  <button
    type={type}
    className={cn(
      "inline-flex size-11 shrink-0 items-center justify-center rounded-control transition-colors duration-150",
      "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
      "disabled:cursor-not-allowed disabled:text-fg-subtle aria-disabled:cursor-not-allowed aria-disabled:text-fg-subtle",
      VARIANTS[variant],
      className,
    )}
    {...rest}
  >
    {icon}
  </button>
);
