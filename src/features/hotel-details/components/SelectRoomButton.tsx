"use client";

import type { Room } from "@/shared/api/schemas";
import { useLocale } from "@/shared/i18n/client";
import { commonMessages } from "@/shared/i18n/common/messages";
import { Button, CalendarIcon } from "@/shared/ui";
import { useHotelDetailsMessages } from "../hooks/useHotelDetailsMessages";
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
  const t = useHotelDetailsMessages().rooms;
  const soldOut = commonMessages.get(useLocale()).availability.soldOut;
  // Nome acessível "Ação: quarto" num texto só (um `<span class="sr-only">` separado ganharia um
  // espaço antes do ":" na leitura). O texto visível é o início do nome (WCAG 2.5.3).
  const label = (action: string) => `${action}: ${room.name}`;
  switch (selectability.kind) {
    case "selectable":
      return (
        <Button
          fullWidth
          aria-label={loading ? undefined : label(t.select)}
          className={WIDTH}
          loading={loading}
          loadingText={t.selecting}
          onClick={onSelect}
        >
          {t.select}
        </Button>
      );
    case "needs-dates":
    case "past-dates":
      return (
        <Button
          variant="secondary"
          fullWidth
          aria-label={label(t.pickDates)}
          className={WIDTH}
          leftIcon={<CalendarIcon className="size-5" />}
          onClick={onPickDates}
        >
          {t.pickDates}
        </Button>
      );
    case "sold-out":
    case "too-small":
    case "insufficient":
      return (
        <Button
          fullWidth
          aria-label={label(selectability.kind === "sold-out" ? soldOut : t.select)}
          className={WIDTH}
          aria-disabled="true"
          aria-describedby={reasonId ?? undefined}
          onClick={(event) => event.preventDefault()}
        >
          {selectability.kind === "sold-out" ? soldOut : t.select}
        </Button>
      );
    default: {
      const unreachable: never = selectability;
      return unreachable;
    }
  }
};
