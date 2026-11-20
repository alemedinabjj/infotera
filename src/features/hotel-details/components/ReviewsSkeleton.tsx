"use client";

import { useSlowLoading } from "@/shared/hooks/useSlowLoading";
import { Skeleton, Spinner } from "@/shared/ui";

const ReviewSkeleton = () => (
  <li className="flex flex-col gap-2 py-5">
    <div className="flex items-start gap-3">
      <Skeleton shape="circle" />
      <div className="flex flex-col gap-1">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-5 w-24" />
      </div>
    </div>
    <Skeleton className="h-5 w-28" />
    <Skeleton className="h-6 w-1/2" />
    <Skeleton className="h-6" />
    <Skeleton className="h-6" />
  </li>
);

/** Skeleton das avaliações com a geometria do item, e o aviso de lentidão após 5 s. */
export const ReviewsSkeleton = () => {
  const slow = useSlowLoading(true);
  return (
    <div aria-busy="true" className="flex flex-col gap-2">
      <p className="flex min-h-5 items-center gap-2 text-sm text-fg-muted">
        <Spinner />
        {slow ? "Está demorando mais que o normal…" : "Carregando avaliações…"}
      </p>
      <ul className="divide-y divide-border">
        <ReviewSkeleton />
        <ReviewSkeleton />
        <ReviewSkeleton />
      </ul>
    </div>
  );
};
