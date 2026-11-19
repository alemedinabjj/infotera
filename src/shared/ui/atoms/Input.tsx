import type { ComponentProps, ReactNode } from "react";
import { cn } from "../../lib/cn";

type InputProps = ComponentProps<"input"> & {
  startIcon?: ReactNode;
  endSlot?: ReactNode;
};

/** Campo de texto 44px. Use dentro de `Field` para label, ajuda e erro. */
export const Input = ({ startIcon, endSlot, className, type = "text", ...rest }: InputProps) => (
  <div className="relative">
    {startIcon ? (
      <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-fg-subtle">
        {startIcon}
      </span>
    ) : null}
    <input
      type={type}
      className={cn(
        "h-11 w-full rounded-control border border-border-strong bg-surface px-3 text-base text-fg",
        "placeholder:text-fg-subtle hover:border-fg-muted focus-visible:border-primary",
        "aria-invalid:border-danger aria-invalid:focus-visible:outline-danger",
        "disabled:cursor-not-allowed disabled:bg-surface-sunken disabled:text-fg-subtle read-only:bg-canvas",
        startIcon && "pl-10",
        endSlot && "pr-10",
        className,
      )}
      {...rest}
    />
    {endSlot ? (
      <span className="absolute inset-y-0 right-1 flex items-center">{endSlot}</span>
    ) : null}
  </div>
);
