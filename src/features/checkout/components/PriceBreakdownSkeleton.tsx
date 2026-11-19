import { Skeleton } from "@/shared/ui";

const ROWS = ["stay", "fee", "tax"] as const;

/** Mesma geometria do detalhamento final (sem desconto). */
export const PriceBreakdownSkeleton = ({ slow }: { slow: boolean }) => (
  <div aria-busy="true" className="flex flex-col gap-2">
    <p role="status" aria-live="polite" className="sr-only">
      Calculando o total…
    </p>
    {ROWS.map((row) => (
      <div key={row} className="flex items-start justify-between gap-3">
        <Skeleton className="h-5 w-3/5" />
        <Skeleton className="h-5 w-20" />
      </div>
    ))}
    <div className="flex items-center justify-between gap-3 border-t border-border pt-3">
      <Skeleton className="h-6 w-16" />
      <Skeleton className="h-8 w-32" />
    </div>
    <Skeleton className="h-5 w-48" />
    <p className="min-h-5 text-sm text-fg-muted">
      {slow ? "Está demorando mais que o normal…" : ""}
    </p>
  </div>
);
