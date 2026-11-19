import { Skeleton } from "@/shared/ui";

/**
 * Skeleton da área hotel/quarto/cancelamento, com a geometria do conteúdo (nada se move quando o
 * conteúdo chega). Termina no `border-t` das datas, que já estão na tela.
 */
export const StayDetailsSkeleton = ({ announce = true }: { announce?: boolean }) => (
  <div aria-busy="true" className="flex flex-col gap-4">
    {announce ? (
      <p aria-live="polite" className="sr-only">
        Carregando dados do hotel…
      </p>
    ) : null}
    <div>
      <div className="flex items-start gap-4">
        <Skeleton shape="block" className="aspect-[4/3] w-24 shrink-0 sm:w-40" />
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <Skeleton className="h-7 w-3/4" />
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-1/2" />
        </div>
      </div>
      <Skeleton shape="block" className="mt-1 h-11 w-44" />
    </div>
    <div className="flex flex-col gap-2 border-t border-border pt-4">
      <Skeleton className="h-5 w-14" />
      <Skeleton className="h-6 w-2/3" />
      <Skeleton className="h-5 w-1/2" />
    </div>
    <div className="flex flex-col gap-2 border-t border-border pt-4">
      <Skeleton className="h-6 w-14" />
      <Skeleton shape="block" className="h-6 w-44 rounded-full" />
      <Skeleton className="h-5 w-full" />
      <Skeleton className="h-5 w-full" />
      <Skeleton className="h-5 w-full" />
    </div>
  </div>
);
