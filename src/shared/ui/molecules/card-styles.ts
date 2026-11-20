import { cn } from "../../lib/cn";

export type CardVariant = "static" | "interactive" | "selected";

const BASE = "relative flex flex-col overflow-hidden rounded-card border border-border bg-surface";

const VARIANTS: Record<CardVariant, string> = {
  static: "shadow-card",
  // Card inteiro clicável por um único link (`::after`): hover e anel de foco no card.
  interactive:
    "group shadow-card transition-shadow duration-150 hover:shadow-raised has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-focus",
  selected: "shadow-card ring-1 ring-primary",
};

/** Classes do card do design system (§5.2): `static`, `interactive` (hover/foco) ou `selected`. */
export const cardClassName = ({
  variant = "static",
  className,
}: {
  variant?: CardVariant;
  className?: string;
} = {}): string => cn(BASE, VARIANTS[variant], className);
