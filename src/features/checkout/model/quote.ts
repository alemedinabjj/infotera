import type { ISODate } from "@/shared/lib/dates";
import { type Coupon, type CouponRejection, evaluateCoupon } from "./coupons";
import { calculatePrice, type PriceQuote } from "./price";

export type CouponStatus =
  | { state: "none" }
  | { state: "valid"; coupon: Coupon }
  | { state: "ineligible"; coupon: Coupon; reason: CouponRejection };

export type QuoteResult = {
  /** Preço final (com o desconto só se o cupom está elegível). */
  quote: PriceQuote;
  /** Preço sem cupom (texto de `coupon-invalid`). */
  baseQuote: PriceQuote;
  coupon: CouponStatus;
};

type QuoteInput = {
  pricePerNight: number;
  nights: number;
  rooms: number;
  coupon: Coupon | null;
  today: ISODate;
};

/**
 * Preço com a elegibilidade do cupom reavaliada: quartos/noites mudam o subtotal, então um cupom
 * aplicado pode deixar de valer (e voltar a valer) sem nova consulta.
 */
export const buildQuote = ({
  pricePerNight,
  nights,
  rooms,
  coupon,
  today,
}: QuoteInput): QuoteResult => {
  const baseQuote = calculatePrice({ pricePerNight, nights, rooms });
  if (!coupon) return { quote: baseQuote, baseQuote, coupon: { state: "none" } };
  const evaluation = evaluateCoupon(coupon, {
    today,
    nights,
    subtotalCents: baseQuote.subtotalCents,
  });
  if (!evaluation.ok) {
    return {
      quote: baseQuote,
      baseQuote,
      coupon: { state: "ineligible", coupon, reason: evaluation.reason },
    };
  }
  const quote = calculatePrice({ pricePerNight, nights, rooms, discount: evaluation.discount });
  return { quote, baseQuote, coupon: { state: "valid", coupon } };
};
