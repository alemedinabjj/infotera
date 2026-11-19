import type { ComponentProps, ReactNode } from "react";
import { cn } from "../../lib/cn";

type RadioProps = Omit<ComponentProps<"input">, "type" | "children"> & {
  label: ReactNode;
};

/** Radio nativo com rótulo clicável. Agrupe em `<fieldset>` com `<legend>`. */
export const Radio = ({ label, className, ...rest }: RadioProps) => (
  <label
    className={cn(
      "flex min-h-11 cursor-pointer items-center gap-3 text-base text-fg",
      rest.disabled && "cursor-not-allowed text-fg-subtle",
      className,
    )}
  >
    <input type="radio" className="size-5 shrink-0 accent-primary" {...rest} />
    <span>{label}</span>
  </label>
);
