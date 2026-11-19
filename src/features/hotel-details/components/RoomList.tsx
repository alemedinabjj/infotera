"use client";

import type { CancellationPolicy, Room } from "@/shared/api/schemas";
import type { SearchCriteria } from "@/shared/lib/search-params";
import { useSelectRoom } from "../hooks/useSelectRoom";
import { RoomCard } from "./RoomCard";

type RoomListProps = {
  hotelId: number;
  rooms: readonly Room[];
  criteria: SearchCriteria | null;
  cancellationPolicy: CancellationPolicy;
  onPickDates: () => void;
};

/** Lista de quartos; guarda a seleção em andamento para travar os demais botões. */
export const RoomList = ({
  hotelId,
  rooms,
  criteria,
  cancellationPolicy,
  onPickDates,
}: RoomListProps) => {
  const { select, pendingRoomId } = useSelectRoom(hotelId, criteria);
  return (
    <ul className="flex flex-col gap-4">
      {rooms.map((room) => (
        <RoomCard
          key={room.id}
          room={room}
          criteria={criteria}
          cancellationPolicy={cancellationPolicy}
          selecting={pendingRoomId === room.id}
          locked={pendingRoomId !== null}
          onSelect={select}
          onPickDates={onPickDates}
        />
      ))}
    </ul>
  );
};
