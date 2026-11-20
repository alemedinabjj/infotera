import type { ComponentProps, ReactNode } from "react";
import { cn } from "../../lib/cn";

type ChoiceProps = Omit<ComponentProps<"input">, "type" | "children"> & {
  label: ReactNode;
};

const ROW = "flex min-h-11 cursor-pointer items-center gap-3 text-base text-fg";

/** Checkbox nativo com rótulo clicável (linha de 44px). Grupos: `<fieldset>` + `<legend>`. */
export const Checkbox = ({ label, className, ...rest }: ChoiceProps) => (
  <label className={cn(ROW, rest.disabled && "cursor-not-allowed text-fg-subtle", className)}>
    <input
      type="checkbox"
      className="size-5 shrink-0 rounded-sm accent-primary aria-invalid:outline-2 aria-invalid:outline-danger"
      {...rest}
    />
    <span>{label}</span>
  </label>
);
