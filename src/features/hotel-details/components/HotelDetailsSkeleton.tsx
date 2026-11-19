"use client";

import { useSlowLoading } from "@/shared/hooks/useSlowLoading";
import { Skeleton } from "@/shared/ui";

/**
 * Skeleton da rota (`loading.tsx`): aparece na hora ao abrir o hotel (o cold start da API pode
 * demorar dezenas de segundos). Mesma geometria da página; após 5 s, avisa que está demorando.
 */
export const HotelDetailsSkeleton = () => {
  const slow = useSlowLoading(true);
  return (
    <div aria-busy="true" className="flex flex-col gap-4">
      <p className="sr-only" aria-live="polite">
        Carregando hotel…
      </p>
      <p aria-hidden={!slow} className="min-h-5 text-sm text-fg-muted">
        {slow ? "Está demorando mais que o normal…" : null}
      </p>
      <Skeleton className="h-5 w-48" />
      <div className="flex flex-col gap-2">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-8 w-3/4 lg:h-9" />
        <Skeleton className="h-5 w-2/3" />
        <Skeleton className="h-6 w-56" />
      </div>
      <Skeleton shape="block" className="aspect-video sm:hidden" />
      <div className="hidden gap-2 sm:grid sm:h-72 sm:grid-cols-4 sm:grid-rows-2 lg:h-96">
        <Skeleton shape="block" className="col-span-2 row-span-2 h-full" />
        <Skeleton shape="block" className="h-full" />
        <Skeleton shape="block" className="h-full" />
        <Skeleton shape="block" className="h-full" />
        <Skeleton shape="block" className="h-full" />
      </div>
      <Skeleton className="h-8 w-56" />
      <div className="flex gap-3">
        <Skeleton shape="block" className="h-11 w-32" />
        <Skeleton shape="block" className="h-11 flex-1 lg:flex-none lg:w-40" />
      </div>
      <Skeleton shape="block" className="h-11" />
      <Skeleton className="h-6" />
      <Skeleton className="h-6" />
      <Skeleton className="h-6" />
    </div>
  );
};
