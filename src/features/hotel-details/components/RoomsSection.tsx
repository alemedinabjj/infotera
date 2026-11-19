"use client";

import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { useSyncExternalStore } from "react";
import { hotelRoomsQueryOptions } from "@/shared/api/queries";
import type { CancellationPolicy } from "@/shared/api/schemas";
import type { SearchCriteria } from "@/shared/lib/search-params";
import { buttonClassName, EmptyState } from "@/shared/ui";
import { focusCheckIn } from "../hooks/focus-dates";
import { canCompare } from "../model/room-comparison";
import { roomTypesLabel } from "../model/room-labels";
import { sectionHeadingId } from "../model/sections";
import { RoomComparison } from "./RoomComparison";
import { RoomList } from "./RoomList";
import { RoomsLoading } from "./RoomsLoading";
import { SectionBoundary } from "./SectionBoundary";
import { SoldOutAlert } from "./SoldOutAlert";

type RoomsSectionProps = {
  hotelId: number;
  /** `availableRooms` do hotel: 0 já mostra o aviso de esgotado sem esperar a lista. */
  hotelAvailableRooms: number;
  cancellationPolicy: CancellationPolicy;
  criteria: SearchCriteria | null;
};

/**
 * Anunciador persistente (fora do Suspense, senão o texto trocaria junto com o skeleton): observa o
 * cache sem disparar request e fala "Carregando quartos…" → "2 tipos de quarto".
 */
const subscribeNothing = (): (() => void) => () => undefined;

const RoomsAnnouncer = ({ hotelId }: { hotelId: number }) => {
  const { data } = useQuery({ ...hotelRoomsQueryOptions(hotelId), enabled: false });
  // No servidor o cache já pode ter os quartos e o cliente começa sem eles: só anuncia depois de
  // hidratar (o 1º render dos dois lados é igual, vazio) para não gerar mismatch.
  const hydrated = useSyncExternalStore(
    subscribeNothing,
    () => true,
    () => false,
  );
  const text = data ? roomTypesLabel(data.length) : "Carregando quartos…";
  return (
    <p className="sr-only" aria-live="polite">
      {hydrated ? text : ""}
    </p>
  );
};

const RoomsContent = ({
  hotelId,
  hotelAvailableRooms,
  cancellationPolicy,
  criteria,
}: RoomsSectionProps) => {
  const { data: rooms } = useSuspenseQuery(hotelRoomsQueryOptions(hotelId));

  if (rooms.length === 0) {
    return (
      <EmptyState
        headingLevel={3}
        title="Nenhum quarto para reserva"
        description="Este hotel ainda não tem quartos cadastrados. Veja hotéis parecidos na mesma região."
        action={
          <a href="#similares" className={buttonClassName({ variant: "secondary" })}>
            Ver hotéis similares
          </a>
        }
      />
    );
  }

  const soldOut = hotelAvailableRooms === 0 || rooms.every((room) => room.available === 0);
  return (
    <>
      {soldOut ? <SoldOutAlert hasDates={criteria !== null} /> : null}
      <p className="min-h-5 text-sm text-fg-muted">{roomTypesLabel(rooms.length)}</p>
      <RoomList
        hotelId={hotelId}
        rooms={rooms}
        criteria={criteria}
        cancellationPolicy={cancellationPolicy}
        onPickDates={focusCheckIn}
      />
      {canCompare(rooms) ? <RoomComparison rooms={rooms} /> : null}
    </>
  );
};

/**
 * Quartos do hotel (`useSuspenseQuery` com as mesmas options do prefetch da F3 e do servidor).
 * O h2 e a barra da estadia ficam fora; loading e erro (com retry no lugar) trocam só o miolo.
 */
export const RoomsSection = (props: RoomsSectionProps) => (
  <div className="flex flex-col gap-4">
    <RoomsAnnouncer hotelId={props.hotelId} />
    <SectionBoundary
      headingId={sectionHeadingId("quartos")}
      errorTitle="Não foi possível carregar os quartos."
      options={hotelRoomsQueryOptions(props.hotelId)}
      loading={<RoomsLoading />}
    >
      <RoomsContent {...props} />
    </SectionBoundary>
  </div>
);
