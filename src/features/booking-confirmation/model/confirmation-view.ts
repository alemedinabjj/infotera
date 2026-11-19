import type { Booking, Hotel, Room } from "@/shared/api/schemas";
import { type CancellationDetails, cancellationDetails } from "@/shared/lib/cancellation";
import { reaisToCents } from "@/shared/lib/currency";
import { formatDate, formatDateRange, type ISODate, nightsBetween } from "@/shared/lib/dates";
import { formatGuests, pluralize } from "@/shared/lib/format";
import { hotelHref } from "@/shared/lib/links";
import {
  isBreakdownConsistent,
  type PriceLine,
  priceBreakdownLines,
} from "@/shared/lib/price-breakdown";
import { bedsLabel } from "@/shared/lib/room-labels";
import { formatBookedAt } from "./booked-at";
import { describeGuests, type GuestsView } from "./guests";
import type { Settled } from "./load-result";

export type PriceView =
  | { kind: "breakdown"; lines: PriceLine[]; totalCents: number }
  | { kind: "total-only"; totalCents: number };

export type BookingView = {
  /** O id completo da reserva (UUID em minúsculas). */
  number: string;
  /** `19/11/2026, 12:04` (horário de Brasília). */
  bookedAt: string;
  /** `12–15 dez · 3 noites` (cartão-resumo). */
  stayLabel: string;
  /** `3 noites · 2 adultos, 1 criança · 1 quarto`. */
  stayDetails: string;
  checkInDate: string;
  checkOutDate: string;
  guests: GuestsView;
  cardLast4: string | null;
  price: PriceView;
};

/**
 * Tudo o que vem **só da reserva** e aparece na hora: datas, noites, hóspedes, pagamento e preço.
 * O preço é o que foi cobrado (nunca recalculado); sem detalhamento confiável, só o `totalPrice`.
 */
export const toBookingView = (booking: Booking, today: ISODate): BookingView => {
  const nights = Math.max(nightsBetween(booking.checkIn, booking.checkOut), 0);
  const { priceBreakdown } = booking;
  const reliable = priceBreakdown && isBreakdownConsistent(priceBreakdown, booking.totalPrice);
  return {
    number: String(booking.id),
    bookedAt: formatBookedAt(booking.createdAt),
    stayLabel: `${formatDateRange(booking.checkIn, booking.checkOut, today)} · ${pluralize(nights, "noite", "noites")}`,
    stayDetails: `${pluralize(nights, "noite", "noites")} · ${formatGuests(booking)}`,
    checkInDate: formatDate(booking.checkIn, "long"),
    checkOutDate: formatDate(booking.checkOut, "long"),
    guests: describeGuests(booking),
    cardLast4: booking.payment?.cardLast4 ?? null,
    price: reliable
      ? {
          kind: "breakdown",
          lines: priceBreakdownLines(priceBreakdown),
          totalCents: priceBreakdown.totalCents,
        }
      : { kind: "total-only", totalCents: reaisToCents(booking.totalPrice) },
  };
};

export type HotelView =
  | {
      status: "ok";
      name: string;
      address: string;
      image: string;
      href: string;
      cancellation: CancellationDetails;
    }
  | { status: "missing"; title: string; notice: string }
  | { status: "error" };

export type RoomView =
  | { status: "ok"; name: string; beds: string }
  | { status: "missing"; title: string; notice: string }
  | { status: "error" };

export type StayView = {
  hotel: HotelView;
  room: RoomView;
  /** Título do `ErrorState` único da seção; `null` quando nada falhou. */
  errorTitle: string | null;
  checkInTime: string;
  checkOutTime: string;
};

const toHotelView = (booking: Booking, hotel: Settled<Hotel>): HotelView => {
  switch (hotel.status) {
    case "ok":
      return {
        status: "ok",
        name: hotel.data.name,
        address: hotel.data.address,
        image: hotel.data.thumbnail,
        href: hotelHref(hotel.data.id, null),
        cancellation: cancellationDetails(hotel.data.cancellationPolicy),
      };
    case "missing":
      return {
        status: "missing",
        title: `Hotel #${booking.hotelId}`,
        notice: "Os dados deste hotel não estão mais disponíveis.",
      };
    case "error":
      return { status: "error" };
    default: {
      const unreachable: never = hotel;
      return unreachable;
    }
  }
};

const toRoomView = (booking: Booking, room: Settled<Room>): RoomView => {
  const missing: RoomView = {
    status: "missing",
    title: `Quarto #${booking.roomId}`,
    notice: "Os dados deste quarto não estão mais disponíveis.",
  };
  switch (room.status) {
    case "ok":
      // A API não valida a reserva: um quarto de outro hotel é reserva forjada, não dado do hotel.
      return room.data.hotelId === booking.hotelId
        ? { status: "ok", name: room.data.name, beds: bedsLabel(room.data.beds) }
        : missing;
    case "missing":
      return missing;
    case "error":
      return { status: "error" };
    default: {
      const unreachable: never = room;
      return unreachable;
    }
  }
};

const errorTitleOf = (hotel: HotelView, room: RoomView): string | null => {
  const hotelFailed = hotel.status === "error";
  const roomFailed = room.status === "error";
  if (hotelFailed && roomFailed) return "Não foi possível carregar os dados do hotel e do quarto.";
  if (hotelFailed) return "Não foi possível carregar os dados do hotel.";
  if (roomFailed) return "Não foi possível carregar os dados do quarto.";
  return null;
};

/** Horários de check-in/out do hotel (ou o aviso quando ele não carregou). */
export const checkTimes = (
  hotel: Settled<Hotel>,
): Pick<StayView, "checkInTime" | "checkOutTime"> => {
  switch (hotel.status) {
    case "ok":
      return {
        checkInTime: `A partir de ${hotel.data.checkInTime}`,
        checkOutTime: `Até ${hotel.data.checkOutTime}`,
      };
    case "missing":
      return { checkInTime: "Confirme com o hotel", checkOutTime: "Confirme com o hotel" };
    case "error":
      return { checkInTime: "Indisponível no momento", checkOutTime: "Indisponível no momento" };
    default: {
      const unreachable: never = hotel;
      return unreachable;
    }
  }
};

/** Hotel e quarto (chegam depois, em streaming) com `ok`/`missing`/`error` por bloco. */
export const toStayView = (
  booking: Booking,
  hotel: Settled<Hotel>,
  room: Settled<Room>,
): StayView => {
  const hotelView = toHotelView(booking, hotel);
  const roomView = toRoomView(booking, room);
  return {
    hotel: hotelView,
    room: roomView,
    errorTitle: errorTitleOf(hotelView, roomView),
    ...checkTimes(hotel),
  };
};
