import type { Room } from "@/shared/api/schemas";
import { QuantityStepper } from "@/shared/ui";
import type { RoomCountBounds } from "../model/room-count";
import { describeCapacity } from "../model/summary-labels";

type RoomCountFieldProps = {
  room: Room | undefined;
  rooms: number;
  bounds: RoomCountBounds | null;
  hint: string | null;
  /** Durante o envio o preço não pode mudar no meio do pedido. */
  locked: boolean;
  onChange: (rooms: number) => void;
};

/** Stepper "Quartos" com optimistic update: o motivo e o status ficam no `hint` (região viva). */
export const RoomCountField = ({
  room,
  rooms,
  bounds,
  hint,
  locked,
  onChange,
}: RoomCountFieldProps) => (
  <QuantityStepper
    label="Quartos"
    description={room ? describeCapacity(room.maxGuests) : undefined}
    hint={hint}
    value={rooms}
    min={bounds?.min ?? rooms}
    max={bounds?.max ?? rooms}
    locked={locked || bounds === null}
    onChange={onChange}
    decreaseLabel="Remover quarto"
    increaseLabel="Adicionar quarto"
  />
);
