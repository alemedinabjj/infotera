import type { Room } from "@/shared/api/schemas";
import type { SearchCriteria } from "@/shared/lib/search-params";
import { Badge, InfoIcon } from "@/shared/ui";
import {
  type RoomSelectability,
  selectabilityBadge,
  selectabilityMessage,
} from "../model/room-selectability";
import { RoomPrice } from "./RoomPrice";
import { SelectRoomButton } from "./SelectRoomButton";

type RoomCardFooterProps = {
  room: Room;
  criteria: SearchCriteria | null;
  selectability: RoomSelectability;
  otherRooms: boolean;
  loading: boolean;
  onSelect: () => void;
  onPickDates: () => void;
};

/**
 * Selo + preço (colados: é onde se decide), motivo do bloqueio **acima** do botão e o botão. O
 * motivo é renderizado junto com o card (nada se move no clique).
 */
export const RoomCardFooter = ({
  room,
  criteria,
  selectability,
  otherRooms,
  loading,
  onSelect,
  onPickDates,
}: RoomCardFooterProps) => {
  const badge = selectabilityBadge(selectability);
  const reason = selectabilityMessage(selectability, criteria !== null, otherRooms);
  const reasonId = reason ? `room-${room.id}-reason` : null;
  return (
    <div className="mt-auto flex flex-col gap-3 border-t border-border pt-3">
      <div className="flex flex-wrap items-end justify-between gap-x-3 gap-y-2">
        {badge ? <Badge tone={badge.tone}>{badge.text}</Badge> : null}
        <div className="ml-auto text-right">
          <RoomPrice room={room} criteria={criteria} selectability={selectability} />
        </div>
      </div>
      {reason ? (
        <p id={reasonId ?? undefined} className="flex items-start gap-1 text-sm text-fg-muted">
          <InfoIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          {reason}
        </p>
      ) : null}
      <SelectRoomButton
        room={room}
        selectability={selectability}
        reasonId={reasonId}
        loading={loading}
        onSelect={onSelect}
        onPickDates={onPickDates}
      />
    </div>
  );
};
