import type { ComponentProps } from "react";
import { cn } from "../../lib/cn";
import { ChevronDownIcon } from "../icons";

/** `<select>` nativo com o visual do Input. */
export const Select = ({ className, children, ...rest }: ComponentProps<"select">) => (
  <div className="relative">
    <select
      className={cn(
        "h-11 w-full appearance-none rounded-control border border-border-strong bg-surface pr-10 pl-3 text-base text-fg",
        "hover:border-fg-muted focus-visible:border-primary",
        "aria-invalid:border-danger aria-invalid:focus-visible:outline-danger",
        "disabled:cursor-not-allowed disabled:bg-surface-sunken disabled:text-fg-subtle",
        className,
      )}
      {...rest}
    >
      {children}
    </select>
    <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-3 size-5 -translate-y-1/2 text-fg-muted" />
  </div>
);
