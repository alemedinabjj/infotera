import type { Booking, Hotel, Room } from "@/shared/api/schemas";
import type { Locale } from "@/shared/i18n/config";
import { formatUnit } from "@/shared/i18n/units";
import { type CancellationDetails, cancellationDetails } from "@/shared/lib/cancellation";
import { reaisToCents } from "@/shared/lib/currency";
import { formatDate, formatDateRange, type ISODate, nightsBetween } from "@/shared/lib/dates";
import { formatGuests } from "@/shared/lib/format";
import { hotelHref } from "@/shared/lib/links";
import {
  isBreakdownConsistent,
  type PriceLine,
  priceBreakdownLines,
} from "@/shared/lib/price-breakdown";
import { bedsLabel } from "@/shared/lib/room-labels";
import { confirmationMessages } from "../i18n/messages";
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
export const toBookingView = (booking: Booking, today: ISODate, locale: Locale): BookingView => {
  const nights = Math.max(nightsBetween(booking.checkIn, booking.checkOut), 0);
  const { priceBreakdown } = booking;
  const reliable = priceBreakdown && isBreakdownConsistent(priceBreakdown, booking.totalPrice);
  return {
    number: String(booking.id),
    bookedAt: formatBookedAt(booking.createdAt, locale),
    stayLabel: `${formatDateRange(booking.checkIn, booking.checkOut, today, locale)} · ${formatUnit(nights, "night", locale)}`,
    stayDetails: `${formatUnit(nights, "night", locale)} · ${formatGuests(booking, locale)}`,
    checkInDate: formatDate(booking.checkIn, "long", locale),
    checkOutDate: formatDate(booking.checkOut, "long", locale),
    guests: describeGuests(booking, locale),
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

const toHotelView = (booking: Booking, hotel: Settled<Hotel>, locale: Locale): HotelView => {
  const t = confirmationMessages.get(locale).stay;
  switch (hotel.status) {
    case "ok":
      return {
        status: "ok",
        name: hotel.data.name,
        address: hotel.data.address,
        image: hotel.data.thumbnail,
        href: hotelHref(hotel.data.id, null),
        cancellation: cancellationDetails(hotel.data.cancellationPolicy, locale),
      };
    case "missing":
      return {
        status: "missing",
        title: t.hotelFallback(booking.hotelId),
        notice: t.hotelMissing,
      };
    case "error":
      return { status: "error" };
    default: {
      const unreachable: never = hotel;
      return unreachable;
    }
  }
};

const toRoomView = (booking: Booking, room: Settled<Room>, locale: Locale): RoomView => {
  const t = confirmationMessages.get(locale).stay;
  const missing: RoomView = {
    status: "missing",
    title: t.roomFallback(booking.roomId),
    notice: t.roomMissing,
  };
  switch (room.status) {
    case "ok":
      // A API não valida a reserva: um quarto de outro hotel é reserva forjada, não dado do hotel.
      return room.data.hotelId === booking.hotelId
        ? { status: "ok", name: room.data.name, beds: bedsLabel(room.data.beds, locale) }
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

const errorTitleOf = (hotel: HotelView, room: RoomView, locale: Locale): string | null => {
  const t = confirmationMessages.get(locale).stay;
  const hotelFailed = hotel.status === "error";
  const roomFailed = room.status === "error";
  if (hotelFailed && roomFailed) return t.errorBoth;
  if (hotelFailed) return t.errorHotel;
  if (roomFailed) return t.errorRoom;
  return null;
};

/** Horários de check-in/out do hotel (ou o aviso quando ele não carregou). */
export const checkTimes = (
  hotel: Settled<Hotel>,
  locale: Locale,
): Pick<StayView, "checkInTime" | "checkOutTime"> => {
  const t = confirmationMessages.get(locale).stay;
  switch (hotel.status) {
    case "ok":
      return {
        checkInTime: t.checkInFrom(hotel.data.checkInTime),
        checkOutTime: t.checkOutUntil(hotel.data.checkOutTime),
      };
    case "missing":
      return { checkInTime: t.askHotel, checkOutTime: t.askHotel };
    case "error":
      return { checkInTime: t.unavailable, checkOutTime: t.unavailable };
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
  locale: Locale,
): StayView => {
  const hotelView = toHotelView(booking, hotel, locale);
  const roomView = toRoomView(booking, room, locale);
  return {
    hotel: hotelView,
    room: roomView,
    errorTitle: errorTitleOf(hotelView, roomView, locale),
    ...checkTimes(hotel, locale),
  };
};
