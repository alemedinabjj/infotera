"use client";

import { useSlowLoading } from "@/shared/hooks/useSlowLoading";
import { Spinner } from "@/shared/ui";
import { RoomCardSkeleton } from "./RoomCardSkeleton";

/** Skeleton dos quartos: linha de status (com "demorando" após 5 s) + 2 cards com a geometria final. */
export const RoomsLoading = () => {
  const slow = useSlowLoading(true);
  return (
    <div aria-busy="true" className="flex flex-col gap-4">
      <p className="flex min-h-5 items-center gap-2 text-sm text-fg-muted">
        <Spinner />
        {slow ? "Está demorando mais que o normal…" : "Carregando quartos…"}
      </p>
      <ul className="flex flex-col gap-4">
        <RoomCardSkeleton />
        <RoomCardSkeleton />
      </ul>
    </div>
  );
};
