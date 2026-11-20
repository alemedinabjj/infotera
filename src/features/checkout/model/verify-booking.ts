import type { Hotel, Room } from "@/shared/api/schemas";
import { addDays, type ISODate, nightsBetween } from "@/shared/lib/dates";
import type { BookingRequest } from "./booking-request";
import type { CheckoutFieldPath } from "./checkout.schema";
import { roomEligibility } from "./checkout-gate";
import { type CouponRejection, evaluateCoupon, findCoupon } from "./coupons";
import { calculatePrice, type PriceQuote } from "./price";

export type Rejection =
  | { status: "price-changed"; quote: PriceQuote }
  | { status: "unavailable"; available: number }
  | { status: "coupon-invalid"; reason: CouponRejection }
  | { status: "invalid"; fields: CheckoutFieldPath[] };

export type Verification = { ok: true; quote: PriceQuote } | { ok: false; rejection: Rejection };

const reject = (rejection: Rejection): Verification => ({ ok: false, rejection });

/**
 * Verificação no servidor, com dados relidos da API: elegibilidade do quarto (datas com tolerância
 * de 1 dia por causa do fuso), cupom e preço recalculado com a **mesma** função pura do cliente.
 * O `totalPrice` gravado nunca vem do cliente: `expectedTotalCents` só detecta preço defasado.
 */
export const verifyBookingRequest = (
  request: BookingRequest,
  hotel: Pick<Hotel, "id">,
  room: Pick<Room, "hotelId" | "available" | "maxGuests" | "pricePerNight">,
  today: ISODate,
): Verification => {
  const { criteria } = request;
  const eligibility = roomEligibility({
    selection: { hotelId: request.hotelId, roomId: request.roomId, criteria },
    hotel,
    room,
    today: addDays(today, -1),
  });
  switch (eligibility) {
    case "sold-out":
    case "insufficient":
      return reject({ status: "unavailable", available: room.available });
    case "mismatch":
      return reject({ status: "unavailable", available: 0 });
    case "stale-dates":
    case "too-small":
      return reject({ status: "invalid", fields: [] });
    case "ready":
      break;
    default: {
      const unreachable: never = eligibility;
      return unreachable;
    }
  }

  const nights = nightsBetween(criteria.checkIn, criteria.checkOut);
  const base = { pricePerNight: room.pricePerNight, nights, rooms: criteria.rooms };
  let discount = null;
  if (request.couponCode !== null) {
    const evaluation = evaluateCoupon(findCoupon(request.couponCode), {
      today,
      nights,
      subtotalCents: calculatePrice(base).subtotalCents,
    });
    if (!evaluation.ok) return reject({ status: "coupon-invalid", reason: evaluation.reason });
    discount = evaluation.discount;
  }
  const quote = calculatePrice({ ...base, discount });
  if (quote.totalCents !== request.expectedTotalCents) {
    return reject({ status: "price-changed", quote });
  }
  return { ok: true, quote };
};
