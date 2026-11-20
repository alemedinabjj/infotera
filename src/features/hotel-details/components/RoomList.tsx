import type { CancellationPolicy, Room } from "@/shared/api/schemas";
import type { Locale } from "@/shared/i18n/config";
import type { SearchCriteria } from "@/shared/lib/search-params";
import { RoomCard } from "./RoomCard";
import { RoomSelectionProvider } from "./RoomSelectionContext";

type RoomListProps = {
  locale: Locale;
  hotelId: number;
  rooms: readonly Room[];
  cancellationPolicy: CancellationPolicy;
  criteria: Promise<SearchCriteria | null>;
};

/** Lista de quartos. O provider guarda a seleção em andamento (trava os demais botões). */
export const RoomList = ({
  locale,
  hotelId,
  rooms,
  cancellationPolicy,
  criteria,
}: RoomListProps) => (
  <RoomSelectionProvider>
    <ul className="flex flex-col gap-4">
      {rooms.map((room) => (
        <RoomCard
          key={room.id}
          locale={locale}
          hotelId={hotelId}
          room={room}
          otherRooms={rooms.length > 1}
          cancellationPolicy={cancellationPolicy}
          criteria={criteria}
        />
      ))}
    </ul>
  </RoomSelectionProvider>
);
