import type { Room } from "@/shared/api/schemas";
import { guestsPerRoom, SEARCH_LIMITS, type SearchCriteria } from "@/shared/lib/search-params";

export type RoomCountBounds = {
  min: number;
  max: number;
  /** Motivo do limite inferior (`null` quando o mínimo é só 1). */
  minHint: string | null;
  /** Motivo do limite superior. */
  maxHint: string;
};

type CriteriaGuests = Pick<SearchCriteria, "adults" | "children">;

export const availableHint = (available: number): string =>
  `Só ${available} ${available === 1 ? "quarto disponível" : "quartos disponíveis"}.`;

/**
 * Limites da quantidade de quartos no checkout. Mínimo: o que acomoda os hóspedes
 * (`ceil(hóspedes / maxGuests)`). Máximo: o menor entre 4, `available` e o nº de adultos (1 adulto
 * por quarto), cada um com o motivo (empate: adultos → disponibilidade → limite).
 */
export const roomCountBounds = (
  criteria: CriteriaGuests,
  room: Pick<Room, "available" | "maxGuests">,
): RoomCountBounds => {
  const guests = criteria.adults + criteria.children;
  const min = Math.max(1, Math.ceil(guests / room.maxGuests));
  const limits = [
    { value: criteria.adults, hint: "Cada quarto precisa de pelo menos 1 adulto." },
    { value: room.available, hint: availableHint(room.available) },
    {
      value: SEARCH_LIMITS.maxRooms,
      hint: `Máximo de ${SEARCH_LIMITS.maxRooms} quartos por reserva.`,
    },
  ];
  const binding = limits.reduce((best, limit) => (limit.value < best.value ? limit : best));
  return {
    min,
    max: Math.max(min, binding.value),
    minHint:
      min > 1
        ? `Este quarto acomoda até ${room.maxGuests} hóspedes: ${guests} hóspedes precisam de pelo menos ${min} quartos.`
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

export const CONFIRM_FAILED_HINT = "Não foi possível confirmar a disponibilidade. Tente de novo.";
export const CONFIRMING_HINT = "Confirmando disponibilidade…";

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
