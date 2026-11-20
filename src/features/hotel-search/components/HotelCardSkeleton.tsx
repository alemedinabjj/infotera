import { Skeleton } from "@/shared/ui";

/** Skeleton com a mesma geometria do `HotelCard` (sem layout shift ao carregar). */
export const HotelCardSkeleton = () => (
  <li>
    <div className="flex flex-col overflow-hidden rounded-card border border-border bg-surface sm:flex-row">
      <Skeleton
        shape="block"
        className="aspect-[5/2] shrink-0 rounded-none sm:aspect-auto sm:min-h-42 sm:w-56"
      />
      <div className="flex flex-1 flex-col gap-2 p-4 md:p-5">
        <Skeleton className="h-7 w-3/4" />
        <Skeleton className="h-5 w-1/2" />
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-6 w-2/3" />
        <Skeleton className="h-5 w-5/6" />
        <div className="mt-auto flex flex-col items-end gap-1 border-t border-border pt-3">
          <Skeleton className="h-7 w-28" />
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-5 w-36" />
        </div>
        <div className="flex min-h-11 items-center">
          <Skeleton className="h-6 w-28" />
        </div>
      </div>
    </div>
  </li>
);
