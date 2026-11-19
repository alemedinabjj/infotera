import { Skeleton } from "@/shared/ui";
import { COMPARISON_MESSAGES } from "../model/messages";

const COLUMNS = ["a", "b", "c"] as const;
const ROWS = ["r1", "r2", "r3", "r4", "r5", "r6"] as const;

/** Skeleton da tabela: cabeçalho de 3 colunas (foto, nome, botão) + 6 linhas. */
export const ComparisonSkeleton = ({ slow }: { slow: boolean }) => (
  <div aria-busy="true" className="flex flex-col gap-3">
    <p aria-live="polite" className="text-sm text-fg-muted">
      {slow ? COMPARISON_MESSAGES.slow : COMPARISON_MESSAGES.loading}
    </p>
    <div className="overflow-hidden rounded-card border border-border">
      <div className="grid grid-cols-[9rem_repeat(3,minmax(9rem,1fr))] gap-3 p-3">
        <div />
        {COLUMNS.map((key) => (
          <div key={key} className="flex flex-col gap-2">
            <Skeleton shape="block" className="aspect-[4/3]" />
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-11 w-24" />
          </div>
        ))}
        {ROWS.flatMap((row) => [
          <Skeleton key={`${row}-label`} className="h-5 w-24" />,
          ...COLUMNS.map((column) => <Skeleton key={`${row}-${column}`} className="h-5 w-full" />),
        ])}
      </div>
    </div>
  </div>
);
