import { formatDate, formatDateRange, type ISODate } from "@/shared/lib/dates";
import { pluralize } from "@/shared/lib/format";
import { guestsPerRoom, type SearchCriteria } from "@/shared/lib/search-params";
import type { RoomEligibility } from "./checkout-gate";

export type BlockedReason = Exclude<RoomEligibility, "ready" | "mismatch">;

export type BlockedCopy = {
  title: string;
  description: string;
  /** Rótulo da ação principal. */
  action: string;
};

type BlockedInput = {
  reason: BlockedReason;
  criteria: SearchCriteria;
  roomName: string | null;
  available: number | null;
  maxGuests: number | null;
  today: ISODate;
};

/** Texto de cada estado bloqueante (design system §6.6). */
export const describeBlocked = ({
  reason,
  criteria,
  roomName,
  available,
  maxGuests,
  today,
}: BlockedInput): BlockedCopy => {
  const room = roomName ?? "O quarto";
  switch (reason) {
    case "sold-out":
      return {
        title: "Este quarto esgotou",
        description: `Não há mais unidades de ${room} para ${formatDateRange(criteria.checkIn, criteria.checkOut, today)}. Escolha outro quarto no mesmo hotel.`,
        action: "Ver quartos",
      };
    case "insufficient": {
      const left = available ?? 0;
      return {
        title: `Só ${pluralize(left, "quarto disponível", "quartos disponíveis")}`,
        description: `Sua reserva pede ${criteria.rooms} quartos de ${room}. Volte ao hotel para escolher outro quarto ou reduzir a quantidade de quartos.`,
        action: "Ver quartos",
      };
    }
    case "too-small":
      return {
        title: "Este quarto não acomoda sua busca",
        description: `${room} acomoda até ${maxGuests ?? 0} hóspedes por quarto e sua busca tem ${guestsPerRoom(criteria)}. Escolha outro quarto ou altere os hóspedes.`,
        action: "Ver quartos",
      };
    case "stale-dates":
      return {
        title: "As datas desta reserva já passaram",
        description: `O check-in era em ${formatDate(criteria.checkIn, "short")}. Escolha novas datas para ver preço e disponibilidade.`,
        action: "Escolher novas datas",
      };
    default: {
      const unreachable: never = reason;
      return unreachable;
    }
  }
};
