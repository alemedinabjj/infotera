import { Skeleton } from "@/shared/ui";

/** Esqueleto com a geometria final do `RoomCard` (sem layout shift quando os quartos chegam). */
export const RoomCardSkeleton = () => (
  <li>
    <div className="flex flex-col overflow-hidden rounded-card border border-border bg-surface shadow-card sm:flex-row">
      <Skeleton
        shape="block"
        className="aspect-[4/3] shrink-0 rounded-none sm:aspect-auto sm:min-h-42 sm:w-56"
      />
      <div className="flex flex-1 flex-col gap-2 p-4 md:p-5">
        <Skeleton className="h-7 w-2/3" />
        <Skeleton className="h-5" />
        <Skeleton className="h-5" />
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-5 w-5/6" />
        <Skeleton className="h-5 w-40" />
        <div className="mt-auto flex flex-col gap-3 border-t border-border pt-3">
          <div className="flex flex-col items-end gap-1">
            <Skeleton className="h-7 w-28" />
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-5 w-32" />
          </div>
          <Skeleton shape="block" className="h-11 sm:ml-auto sm:w-56" />
        </div>
      </div>
    </div>
  </li>
);
