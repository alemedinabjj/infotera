import type { Room } from "@/shared/api/schemas";
import { DEFAULT_LOCALE, type Locale } from "@/shared/i18n/config";
import { formatUnit } from "@/shared/i18n/units";
import { guestsPerRoom, SEARCH_LIMITS, type SearchCriteria } from "@/shared/lib/search-params";
import { checkoutMessages } from "../i18n/messages";

export type RoomCountBounds = {
  min: number;
  max: number;
  /** Motivo do limite inferior (`null` quando o mínimo é só 1). */
  minHint: string | null;
  /** Motivo do limite superior. */
  maxHint: string;
};

type CriteriaGuests = Pick<SearchCriteria, "adults" | "children">;

export const availableHint = (available: number, locale: Locale = DEFAULT_LOCALE): string =>
  checkoutMessages.get(locale).roomCount.available(available);

/**
 * Limites da quantidade de quartos no checkout. Mínimo: o que acomoda os hóspedes
 * (`ceil(hóspedes / maxGuests)`). Máximo: o menor entre 4, `available` e o nº de adultos (1 adulto
 * por quarto), cada um com o motivo (empate: adultos → disponibilidade → limite).
 */
export const roomCountBounds = (
  criteria: CriteriaGuests,
  room: Pick<Room, "available" | "maxGuests">,
  locale: Locale = DEFAULT_LOCALE,
): RoomCountBounds => {
  const t = checkoutMessages.get(locale).roomCount;
  const guests = criteria.adults + criteria.children;
  const min = Math.max(1, Math.ceil(guests / room.maxGuests));
  const limits = [
    { value: criteria.adults, hint: t.needsAdult },
    { value: room.available, hint: availableHint(room.available, locale) },
    { value: SEARCH_LIMITS.maxRooms, hint: t.maxRooms(SEARCH_LIMITS.maxRooms) },
  ];
  const binding = limits.reduce((best, limit) => (limit.value < best.value ? limit : best));
  return {
    min,
    max: Math.max(min, binding.value),
    minHint:
      min > 1
        ? t.minRooms(
            formatUnit(room.maxGuests, "guest", locale),
            formatUnit(guests, "guest", locale),
            formatUnit(min, "room", locale),
          )
        : null,
    maxHint: binding.hint,
  };
};

/** Motivo a mostrar no `hint` do stepper para o valor atual (no limite), senão `null`. */
export const limitHint = (bounds: RoomCountBounds, value: number): string | null => {
  if (value >= bounds.max) return bounds.maxHint;
  if (value <= bounds.min) return bounds.minHint;
  return null;
};

/** Hóspedes por quarto com `rooms` quartos (para o texto do bloqueio). */
export const guestsFor = (criteria: CriteriaGuests & { rooms: number }): number =>
  guestsPerRoom(criteria);

/** Motivos de uma confirmação que falhou e de uma em andamento (região viva do stepper). */
export const confirmFailedHint = (locale: Locale = DEFAULT_LOCALE): string =>
  checkoutMessages.get(locale).roomCount.confirmFailed;
export const confirmingHint = (locale: Locale = DEFAULT_LOCALE): string =>
  checkoutMessages.get(locale).roomCount.confirming;

export type RoomCountState = {
  /** Valor exibido (e usado no preço): otimista. */
  value: number;
  /** Último valor que a API confirmou. */
  confirmed: number;
  /** Id do último pedido de confirmação. */
  seq: number;
  /** Maior `seq` já confirmado (confirmação atrasada de um pedido velho é descartada). */
  confirmedSeq: number;
  status: "idle" | "confirming";
  /** Motivo do último rollback; some no próximo clique. */
  note: string | null;
};

export type RoomCountAction =
  | { type: "change"; value: number }
  | { type: "confirmed"; seq: number; value: number }
  | { type: "rejected"; seq: number; note: string };

export const initialRoomCountState = (value: number): RoomCountState => ({
  value,
  confirmed: value,
  seq: 0,
  confirmedSeq: 0,
  status: "idle",
  note: null,
});

/**
 * Optimistic update com `seq`: o último clique vence. Confirmação fora de ordem só avança o
 * "último confirmado"; rejeição só vale se for do pedido mais recente e volta para o confirmado
 * (não para o clique anterior).
 */
export const roomCountReducer = (
  state: RoomCountState,
  action: RoomCountAction,
): RoomCountState => {
  switch (action.type) {
    case "change":
      return {
        ...state,
        value: action.value,
        seq: state.seq + 1,
        status: "confirming",
        note: null,
      };
    case "confirmed": {
      const fresh = action.seq > state.confirmedSeq;
      return {
        ...state,
        confirmed: fresh ? action.value : state.confirmed,
        confirmedSeq: fresh ? action.seq : state.confirmedSeq,
        status: action.seq === state.seq ? "idle" : state.status,
      };
    }
    case "rejected":
      if (action.seq !== state.seq) return state;
      return { ...state, value: state.confirmed, status: "idle", note: action.note };
    default: {
      const unreachable: never = action;
      return unreachable;
    }
  }
};
