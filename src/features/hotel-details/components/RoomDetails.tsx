import type { CancellationPolicy, Room } from "@/shared/api/schemas";
import { BedIcon, CheckIcon, ChevronDownIcon, InfoIcon, UserIcon } from "@/shared/ui";
import { cancellationDetails } from "../model/cancellation";
import {
  bedsLabel,
  roomAmenityLabel,
  roomCapacityLabel,
  roomSizeLabel,
} from "../model/room-labels";

const VISIBLE_AMENITIES = 4;

/** Tamanho, capacidade e camas, com ícones decorativos. */
export const RoomFacts = ({ room }: { room: Room }) => (
  <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-fg-muted">
    <li>
      <span aria-hidden="true">{roomSizeLabel(room.size)}</span>
      <span className="sr-only">{room.size.toLocaleString("pt-BR")} metros quadrados</span>
    </li>
    <li className="flex items-center gap-1">
      <UserIcon aria-hidden="true" className="size-4" />
      {roomCapacityLabel(room.maxGuests)}
    </li>
    {room.beds.length > 0 ? (
      <li className="flex items-center gap-1">
        <BedIcon aria-hidden="true" className="size-4" />
        {bedsLabel(room.beds)}
      </li>
    ) : null}
  </ul>
);

const Amenity = ({ label }: { label: string }) => (
  <li className="flex items-center gap-1">
    <CheckIcon aria-hidden="true" className="size-4 shrink-0 text-success" />
    {label}
  </li>
);

/** Até 4 comodidades; o resto num `<details>` que abre **abaixo** (nada acima se move). */
export const RoomAmenities = ({ room }: { room: Room }) => {
  const shown = room.amenities.slice(0, VISIBLE_AMENITIES);
  const hidden = room.amenities.slice(VISIBLE_AMENITIES);
  if (shown.length === 0) return null;
  return (
    <div>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-fg">
        {shown.map((amenity) => (
          <Amenity key={amenity} label={roomAmenityLabel(amenity)} />
        ))}
      </ul>
      {hidden.length > 0 ? (
        <details className="group">
          <summary className="inline-flex min-h-11 cursor-pointer list-none items-center gap-1 text-sm font-medium text-primary [&::-webkit-details-marker]:hidden">
            +{hidden.length} {hidden.length === 1 ? "comodidade" : "comodidades"}
            <ChevronDownIcon
              aria-hidden="true"
              className="size-4 transition-transform group-open:rotate-180"
            />
          </summary>
          <ul className="flex flex-wrap gap-x-4 gap-y-1 pb-1 text-sm text-fg">
            {hidden.map((amenity) => (
              <Amenity key={amenity} label={roomAmenityLabel(amenity)} />
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
};

/** Condição de cancelamento do hotel, visível antes do preço (nunca escondida). */
export const RoomCancellation = ({ policy }: { policy: CancellationPolicy }) => {
  const { label, tone } = cancellationDetails(policy);
  const free = tone === "success";
  return (
    <p className={`flex items-center gap-1 text-sm ${free ? "text-success" : "text-fg-muted"}`}>
      {free ? (
        <CheckIcon aria-hidden="true" className="size-4 shrink-0" />
      ) : (
        <InfoIcon aria-hidden="true" className="size-4 shrink-0" />
      )}
      {label}
    </p>
  );
};
