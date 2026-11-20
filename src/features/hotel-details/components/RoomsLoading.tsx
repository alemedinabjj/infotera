"use client";

import { useSlowLoading } from "@/shared/hooks/useSlowLoading";
import { Spinner } from "@/shared/ui";
import { useHotelDetailsMessages } from "../hooks/useHotelDetailsMessages";
import { RoomCardSkeleton } from "./RoomCardSkeleton";

/** Skeleton dos quartos: linha de status (com "demorando" após 5 s) + 2 cards com a geometria final. */
export const RoomsLoading = () => {
  const t = useHotelDetailsMessages().loading;
  const slow = useSlowLoading(true);
  return (
    <div aria-busy="true" className="flex flex-col gap-4">
      <p className="flex min-h-5 items-center gap-2 text-sm text-fg-muted">
        <Spinner />
        {slow ? t.slow : t.rooms}
      </p>
      <ul className="flex flex-col gap-4">
        <RoomCardSkeleton />
        <RoomCardSkeleton />
      </ul>
    </div>
  );
};
