import type { CancellationPolicy, Room } from "@/shared/api/schemas";
import type { Locale } from "@/shared/i18n/config";
import type { SearchCriteria } from "@/shared/lib/search-params";
import { buttonClassName, EmptyState } from "@/shared/ui";
import { hotelDetailsMessages } from "../i18n/messages";
import { canCompare } from "../model/room-comparison";
import { roomTypesLabel } from "../model/room-labels";
import { RoomComparison } from "./RoomComparison";
import { RoomList } from "./RoomList";
import { SoldOutAlert } from "./SoldOutAlert";
import { StayAware } from "./StayAware";

type RoomsSectionProps = {
  locale: Locale;
  hotelId: number;
  rooms: readonly Room[];
  /** `availableRooms` do hotel: 0 já mostra o aviso de esgotado no topo da seção. */
  hotelAvailableRooms: number;
  cancellationPolicy: CancellationPolicy;
  criteria: Promise<SearchCriteria | null>;
};

/**
 * Quartos do hotel (Server Component, do cache do catálogo): a lista entra na casca estática. O h2 e
 * a barra da estadia ficam fora; cada card tem o seu buraco (`RoomStayAction`).
 */
export const RoomsSection = ({
  locale,
  hotelId,
  rooms,
  hotelAvailableRooms,
  cancellationPolicy,
  criteria,
}: RoomsSectionProps) => {
  const t = hotelDetailsMessages.get(locale).rooms;
  if (rooms.length === 0) {
    return (
      <EmptyState
        headingLevel={3}
        title={t.emptyTitle}
        description={t.emptyBody}
        action={
          <a href="#similares" className={buttonClassName({ variant: "secondary" })}>
            {t.seeSimilar}
          </a>
        }
      />
    );
  }

  // Hotel esgotado já foi avisado no topo de "Quartos" (antes do formulário de datas).
  const soldOut = hotelAvailableRooms !== 0 && rooms.every((room) => room.available === 0);
  return (
    <div className="flex flex-col gap-4">
      {soldOut ? (
        <StayAware criteria={criteria}>
          {(resolved) => <SoldOutAlert hasDates={resolved !== null} locale={locale} />}
        </StayAware>
      ) : null}
      <p className="min-h-5 text-sm text-fg-muted">{roomTypesLabel(rooms.length, locale)}</p>
      <RoomList
        locale={locale}
        hotelId={hotelId}
        rooms={rooms}
        cancellationPolicy={cancellationPolicy}
        criteria={criteria}
      />
      {canCompare(rooms) ? <RoomComparison rooms={rooms} /> : null}
    </div>
  );
};
