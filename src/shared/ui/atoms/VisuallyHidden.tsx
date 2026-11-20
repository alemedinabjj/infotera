import type { ComponentProps } from "react";
import { cn } from "../../lib/cn";

/** Texto só para leitores de tela. */
export const VisuallyHidden = ({ className, ...rest }: ComponentProps<"span">) => (
  <span className={cn("sr-only", className)} {...rest} />
);
