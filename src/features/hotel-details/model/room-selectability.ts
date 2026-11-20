import type { Room } from "@/shared/api/schemas";
import { commonMessages } from "@/shared/i18n/common/messages";
import type { Locale } from "@/shared/i18n/config";
import { SCARCE_THRESHOLD } from "@/shared/lib/availability";
import { guestsPerRoom, type SearchCriteria } from "@/shared/lib/search-params";
import { hotelDetailsMessages } from "../i18n/messages";

export type RoomSelectability =
  | { kind: "sold-out" }
  | { kind: "needs-dates" }
  | { kind: "past-dates" }
  | { kind: "too-small"; maxGuests: number; guestsPerRoom: number }
  | { kind: "insufficient"; available: number; requested: number }
  | { kind: "selectable"; scarce: number | null };

/**
 * O que a pessoa pode fazer com o quarto. Precedência: esgotado → sem datas → datas já passadas
 * (`pastDates`: check-in anterior a hoje) → pequeno demais para os hóspedes → menos quartos que o
 * pedido → selecionável (`scarce` com ≤ 2 restantes).
 */
export const roomSelectability = (
  room: Room,
  criteria: SearchCriteria | null,
  pastDates = false,
): RoomSelectability => {
  if (room.available <= 0) return { kind: "sold-out" };
  if (criteria === null) return { kind: "needs-dates" };
  if (pastDates) return { kind: "past-dates" };
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

/**
 * Motivo (texto visível acima do botão) quando a ação está bloqueada; `null` quando não há.
 * `otherRooms`: o hotel tem outro tipo de quarto (senão a mensagem não sugere "outro quarto").
 */
export const selectabilityMessage = (
  selectability: RoomSelectability,
  hasDates: boolean,
  otherRooms: boolean,
  locale: Locale,
): string | null => {
  const t = hotelDetailsMessages.get(locale).selectability;
  switch (selectability.kind) {
    case "sold-out":
      return hasDates ? t.soldOutDates : t.soldOutNow;
    case "too-small": {
      const capacity =
        selectability.maxGuests === 1 ? t.fitsOne : t.fitsUpTo({ count: selectability.maxGuests });
      return t.tooSmall({
        capacity,
        perRoom: selectability.guestsPerRoom,
        advice: otherRooms ? t.adviceOther : t.adviceGuests,
      });
    }
    case "insufficient":
      return `${t.asks({ count: selectability.requested })} ${otherRooms ? t.reduceOther : t.reduce}`;
    case "past-dates":
      return t.pastDates;
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
export const selectabilityBadge = (
  selectability: RoomSelectability,
  locale: Locale,
): SelectabilityBadge | null => {
  const t = hotelDetailsMessages.get(locale).selectability;
  switch (selectability.kind) {
    case "sold-out":
      return { tone: "danger", text: commonMessages.get(locale).availability.soldOut };
    case "insufficient":
      return {
        tone: "warning",
        text:
          selectability.available === 1
            ? t.onlyOne
            : t.onlyMany({ count: selectability.available }),
      };
    case "selectable":
      return selectability.scarce === null
        ? null
        : { tone: "warning", text: t.scarce({ count: selectability.scarce }) };
    case "needs-dates":
    case "past-dates":
    case "too-small":
      return null;
    default: {
      const unreachable: never = selectability;
      return unreachable;
    }
  }
};
