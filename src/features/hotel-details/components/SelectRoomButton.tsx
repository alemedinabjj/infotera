"use client";

import type { Room } from "@/shared/api/schemas";
import { Button, CalendarIcon } from "@/shared/ui";
import type { RoomSelectability } from "../model/room-selectability";

type SelectRoomButtonProps = {
  room: Room;
  selectability: RoomSelectability;
  /** `id` do motivo visível (liga o botão bloqueado a ele por `aria-describedby`). */
  reasonId: string | null;
  loading: boolean;
  onSelect: () => void;
  onPickDates: () => void;
};

const RoomName = ({ name }: { name: string }) => <span className="sr-only">: {name}</span>;

const WIDTH = "sm:ml-auto sm:w-56";

/**
 * Botão do quarto por estado (`switch` exaustivo): selecionável, "Escolher datas" ou bloqueado.
 * Bloqueado usa `aria-disabled` (nunca `disabled`: o foco fica e o leitor lê o motivo).
 */
export const SelectRoomButton = ({
  room,
  selectability,
  reasonId,
  loading,
  onSelect,
  onPickDates,
}: SelectRoomButtonProps) => {
  switch (selectability.kind) {
    case "selectable":
      return (
        <Button
          fullWidth
          className={WIDTH}
          loading={loading}
          loadingText="Selecionando…"
          onClick={onSelect}
        >
          Selecionar quarto
          <RoomName name={room.name} />
        </Button>
      );
    case "needs-dates":
      return (
        <Button
          variant="secondary"
          fullWidth
          className={WIDTH}
          leftIcon={<CalendarIcon className="size-5" />}
          onClick={onPickDates}
        >
          Escolher datas
          <RoomName name={room.name} />
        </Button>
      );
    case "sold-out":
    case "too-small":
    case "insufficient":
      return (
        <Button
          fullWidth
          className={WIDTH}
          aria-disabled="true"
          aria-describedby={reasonId ?? undefined}
          onClick={(event) => event.preventDefault()}
        >
          {selectability.kind === "sold-out" ? "Esgotado" : "Selecionar quarto"}
          <RoomName name={room.name} />
        </Button>
      );
    default: {
      const unreachable: never = selectability;
      return unreachable;
    }
  }
};
