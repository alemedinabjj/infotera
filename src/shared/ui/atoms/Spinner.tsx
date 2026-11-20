import { cn } from "../../lib/cn";

type SpinnerProps = { className?: string };

/** Indicador de ação curta. Sempre ao lado de texto visível ou `VisuallyHidden`. */
export const Spinner = ({ className }: SpinnerProps) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
    focusable="false"
    className={cn("size-4 animate-spin", className)}
  >
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" opacity="0.25" />
    <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
  </svg>
);
