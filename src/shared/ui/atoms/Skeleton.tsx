import type { ComponentProps } from "react";
import { cn } from "../../lib/cn";

type SkeletonShape = "line" | "block" | "circle";

const SHAPES: Record<SkeletonShape, string> = {
  line: "h-4 w-full rounded-control",
  block: "w-full rounded-control",
  circle: "size-10 rounded-full",
};

type SkeletonProps = Omit<ComponentProps<"div">, "children"> & { shape?: SkeletonShape };

/** Placeholder de carregamento. O container da região deve ter `aria-busy` e texto `sr-only`. */
export const Skeleton = ({ shape = "line", className, ...rest }: SkeletonProps) => (
  <div
    aria-hidden="true"
    className={cn("animate-pulse bg-surface-sunken", SHAPES[shape], className)}
    {...rest}
  />
);
