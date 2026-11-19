import { Skeleton } from "@/shared/ui";

const FIELD_ROWS = ["a", "b", "c", "d"] as const;
const STEP_CIRCLES = ["a", "b", "c"] as const;

/** Casca da página enquanto hidrata (ou recarrega): mesma geometria do conteúdo final. */
export const CheckoutSkeleton = () => (
  <div aria-busy="true" className="flex flex-col gap-6 pb-36 sm:pb-28 lg:pb-0">
    <p role="status" className="sr-only">
      Carregando sua reserva…
    </p>
    <div className="flex flex-col gap-4 lg:gap-6">
      <Skeleton className="h-5 w-32" />
      <Skeleton className="h-8 w-56 lg:h-9" />
    </div>
    <div className="grid gap-6 lg:grid-cols-[1fr_22rem] lg:items-start lg:gap-8">
      <div className="grid max-w-2xl grid-cols-3 gap-2 lg:col-start-1 lg:row-start-1">
        {STEP_CIRCLES.map((id) => (
          <div key={id} className="flex flex-col items-center gap-2">
            <Skeleton shape="circle" className="size-8" />
            <Skeleton className="h-5 w-16" />
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-3 rounded-card border border-border bg-surface p-4 lg:col-start-2 lg:row-span-2 lg:row-start-1">
        <div className="flex gap-3">
          <Skeleton shape="block" className="aspect-[4/3] w-20" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-5 w-1/2" />
          </div>
        </div>
        <Skeleton className="h-5 w-2/3" />
        <Skeleton className="h-5 w-40" />
      </div>
      <div className="flex max-w-2xl flex-col gap-4 rounded-card border border-border bg-surface p-4 lg:col-start-1 lg:row-start-2 lg:p-5">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-7 w-48" />
        {FIELD_ROWS.map((id) => (
          <div key={id} className="flex flex-col gap-1.5">
            <Skeleton className="h-5 w-24" />
            <Skeleton shape="block" className="h-11 w-full" />
          </div>
        ))}
      </div>
    </div>
    <div className="fixed inset-x-0 bottom-0 z-30 flex flex-col gap-2 border-t border-border bg-surface px-4 pt-3 pb-3 lg:hidden">
      <Skeleton className="h-7 w-28" />
      <Skeleton shape="block" className="h-11 w-full" />
    </div>
  </div>
);
