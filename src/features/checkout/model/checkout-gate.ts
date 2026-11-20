import type { Hotel, Room } from "@/shared/api/schemas";
import { type ISODate, isBeforeToday } from "@/shared/lib/dates";
import { hotelHref } from "@/shared/lib/links";
import { guestsPerRoom } from "@/shared/lib/search-params";
import type { RoomSelection } from "@/shared/stores/booking-draft";

export type DocumentState = "ok" | "reload";

export type CheckoutGate = "hydrating" | "reloading" | "redirect-empty" | "leaving" | "ready";

type GateInput = {
  hydrated: boolean;
  selection: RoomSelection | null;
  /** Reserva criada: a seleção é limpa, mas estamos indo para a confirmação (não para `/`). */
  submitted: boolean;
  /** `reload` quando o documento não foi carregado em `/checkout` (CSP frouxa). */
  document: DocumentState;
};

/**
 * Qual tela a página mostra. Nunca redireciona antes da hidratação (o store do servidor é vazio) e
 * nunca mostra o formulário num documento sem a CSP do checkout.
 */
export const selectionGate = ({
  hydrated,
  selection,
  submitted,
  document,
}: GateInput): CheckoutGate => {
  if (submitted) return "leaving";
  if (document === "reload") return "reloading";
  if (!hydrated) return "hydrating";
  return selection ? "ready" : "redirect-empty";
};

export type RoomEligibility =
  | "ready"
  | "stale-dates"
  | "sold-out"
  | "insufficient"
  | "too-small"
  | "mismatch";

type EligibilityInput = {
  selection: RoomSelection;
  hotel: Pick<Hotel, "id">;
  room: Pick<Room, "hotelId" | "available" | "maxGuests">;
  today: ISODate;
};

/** Precedência: dado inconsistente → datas passadas → esgotado → poucos quartos → quarto pequeno. */
export const roomEligibility = ({
  selection,
  hotel,
  room,
  today,
}: EligibilityInput): RoomEligibility => {
  const { criteria } = selection;
  if (room.hotelId !== selection.hotelId || hotel.id !== selection.hotelId) return "mismatch";
  if (isBeforeToday(criteria.checkIn, today)) return "stale-dates";
  if (room.available === 0) return "sold-out";
  if (room.available < criteria.rooms) return "insufficient";
  if (guestsPerRoom(criteria) > room.maxGuests) return "too-small";
  return "ready";
};

/** Link "Ver quartos": com critérios, exceto datas passadas (a pessoa precisa escolher de novo). */
export const hotelBackHref = (selection: RoomSelection, eligibility: RoomEligibility): string =>
  hotelHref(selection.hotelId, eligibility === "stale-dates" ? null : selection.criteria);
