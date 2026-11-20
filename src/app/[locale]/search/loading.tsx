import { ResultsSkeleton } from "@/features/hotel-search";
import { Skeleton } from "@/shared/ui";

/** Esqueleto da rota (raramente aparece: o servidor não espera a API). */
const SearchLoading = () => (
  <div aria-busy="true" className="flex flex-col gap-6 lg:gap-8">
    <p className="sr-only" aria-live="polite">
      Carregando busca…
    </p>
    <div className="flex flex-col gap-3">
      <Skeleton className="h-8 w-2/3" />
      <Skeleton className="h-5 w-1/2" />
      <div className="flex gap-3">
        <Skeleton className="h-9 w-36" />
        <Skeleton className="h-9 w-28" />
      </div>
    </div>
    <div className="lg:grid lg:grid-cols-[18rem_1fr] lg:gap-8">
      <div className="hidden flex-col gap-4 lg:flex">
        {["a", "b", "c", "d"].map((key) => (
          <Skeleton key={key} shape="block" className="h-24" />
        ))}
      </div>
      <div className="flex min-w-0 flex-col gap-4">
        <div>
          <Skeleton className="h-7 w-48" />
          <Skeleton className="mt-1 h-5 w-32" />
        </div>
        <ResultsSkeleton />
      </div>
    </div>
  </div>
);

export default SearchLoading;
