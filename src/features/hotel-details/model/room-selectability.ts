import type { Room } from "@/shared/api/schemas";
import { SCARCE_THRESHOLD } from "@/shared/lib/availability";
import { guestsPerRoom, type SearchCriteria } from "@/shared/lib/search-params";

export type RoomSelectability =
  | { kind: "sold-out" }
  | { kind: "needs-dates" }
  | { kind: "too-small"; maxGuests: number; guestsPerRoom: number }
  | { kind: "insufficient"; available: number; requested: number }
  | { kind: "selectable"; scarce: number | null };

/**
 * O que a pessoa pode fazer com o quarto. Precedência: esgotado → sem datas → pequeno demais
 * para os hóspedes → menos quartos que o pedido → selecionável (`scarce` com ≤ 2 restantes).
 */
export const roomSelectability = (
  room: Room,
  criteria: SearchCriteria | null,
): RoomSelectability => {
  if (room.available <= 0) return { kind: "sold-out" };
  if (criteria === null) return { kind: "needs-dates" };
  const perRoom = guestsPerRoom(criteria);
  if (perRoom > room.maxGuests) {
    return { kind: "too-small", maxGuests: room.maxGuests, guestsPerRoom: perRoom };
  }
  if (room.available < criteria.rooms) {
    return { kind: "insufficient", available: room.available, requested: criteria.rooms };
  }
  return { kind: "selectable", scarce: room.available <= SCARCE_THRESHOLD ? room.available : null };
};

/** Pode gravar no `booking-draft` e ir para o checkout. */
export const canSelect = (selectability: RoomSelectability): boolean =>
  selectability.kind === "selectable";

/** Motivo (texto visível acima do botão) quando a ação está bloqueada; `null` quando não há. */
export const selectabilityMessage = (
  selectability: RoomSelectability,
  hasDates: boolean,
): string | null => {
  switch (selectability.kind) {
    case "sold-out":
      return hasDates
        ? "Sem quartos disponíveis para estas datas."
        : "Sem quartos disponíveis no momento.";
    case "too-small": {
      const capacity =
        selectability.maxGuests === 1
          ? "Acomoda 1 hóspede."
          : `Acomoda até ${selectability.maxGuests} hóspedes.`;
      return `${capacity} Sua busca tem ${selectability.guestsPerRoom} por quarto. Escolha outro quarto ou altere os hóspedes.`;
    }
    case "insufficient":
      return `Sua busca pede ${selectability.requested} ${selectability.requested === 1 ? "quarto" : "quartos"}. Diminua a quantidade de quartos ou escolha outro tipo.`;
    case "needs-dates":
    case "selectable":
      return null;
    default: {
      const unreachable: never = selectability;
      return unreachable;
    }
  }
};

export type SelectabilityBadge = { tone: "danger" | "warning"; text: string };

/** Selo colado ao preço: esgotado, "Só N disponíveis" ou "Apenas N quartos!". */
export const selectabilityBadge = (selectability: RoomSelectability): SelectabilityBadge | null => {
  switch (selectability.kind) {
    case "sold-out":
      return { tone: "danger", text: "Esgotado" };
    case "insufficient":
      return {
        tone: "warning",
        text:
          selectability.available === 1
            ? "Só 1 disponível"
            : `Só ${selectability.available} disponíveis`,
      };
    case "selectable":
      return selectability.scarce === null
        ? null
        : {
            tone: "warning",
            text: `Apenas ${selectability.scarce} ${selectability.scarce === 1 ? "quarto" : "quartos"}!`,
          };
    case "needs-dates":
    case "too-small":
      return null;
    default: {
      const unreachable: never = selectability;
      return unreachable;
    }
  }
};
