import { type ISODate, isBeforeToday } from "@/shared/lib/dates";
import { formatCents } from "@/shared/lib/price-breakdown";
import { z } from "@/shared/lib/zod";
import type { PriceDiscount } from "./price";

export type Coupon = {
  code: string;
  discount: { kind: "percent"; bps: number } | { kind: "fixed"; cents: number };
  minNights?: number;
  minSubtotalCents?: number;
  /** Último dia de validade (inclusive). */
  expiresOn?: ISODate;
};

/** Cupons de demonstração (a mock-api não tem endpoint de cupom). Documentados no README. */
export const COUPONS: Record<string, Coupon> = {
  BEMVINDO10: { code: "BEMVINDO10", discount: { kind: "percent", bps: 1000 } },
  FERIAS15: { code: "FERIAS15", discount: { kind: "percent", bps: 1500 }, minNights: 3 },
  DESCONTO50: {
    code: "DESCONTO50",
    discount: { kind: "fixed", cents: 5000 },
    minSubtotalCents: 30000,
  },
  VERAO2024: {
    code: "VERAO2024",
    discount: { kind: "percent", bps: 2000 },
    expiresOn: "2024-03-31",
  },
};

export const COUPON_FORMAT_MESSAGE = "Use de 4 a 12 letras ou números, sem espaços.";

/** Código normalizado (trim + maiúsculas); espaços internos continuam e reprovam o formato. */
export const normalizeCouponCode = (raw: string): string => raw.trim().toUpperCase();

/** Formato de um código **já normalizado**: 4–12 letras ou números. */
export const couponCodeSchema = z.string().regex(/^[A-Z0-9]{4,12}$/, COUPON_FORMAT_MESSAGE);

export const findCoupon = (code: string): Coupon | null =>
  Object.hasOwn(COUPONS, code) ? (COUPONS[code] ?? null) : null;

export type CouponRejection =
  | { kind: "not-found" }
  | { kind: "expired" }
  | { kind: "min-nights"; nights: number }
  | { kind: "min-subtotal"; cents: number };

export type CouponEvaluation =
  | { ok: true; discount: PriceDiscount }
  | { ok: false; reason: CouponRejection };

type CouponContext = { today: ISODate; nights: number; subtotalCents: number };

/** Elegibilidade pura e síncrona; reavaliada quando os quartos mudam e no servidor. */
export const evaluateCoupon = (coupon: Coupon | null, context: CouponContext): CouponEvaluation => {
  if (!coupon) return { ok: false, reason: { kind: "not-found" } };
  if (coupon.expiresOn && isBeforeToday(coupon.expiresOn, context.today)) {
    return { ok: false, reason: { kind: "expired" } };
  }
  if (coupon.minNights !== undefined && context.nights < coupon.minNights) {
    return { ok: false, reason: { kind: "min-nights", nights: coupon.minNights } };
  }
  if (coupon.minSubtotalCents !== undefined && context.subtotalCents < coupon.minSubtotalCents) {
    return { ok: false, reason: { kind: "min-subtotal", cents: coupon.minSubtotalCents } };
  }
  return { ok: true, discount: { code: coupon.code, ...coupon.discount } };
};

/** Texto do motivo (erro do campo e anúncios). */
export const couponMessage = (reason: CouponRejection): string => {
  switch (reason.kind) {
    case "not-found":
      return "Cupom não encontrado. Confira o código.";
    case "expired":
      return "Este cupom expirou.";
    case "min-nights":
      return `Válido para estadias a partir de ${reason.nights} noites.`;
    case "min-subtotal":
      return `Válido para reservas a partir de ${formatCents(reason.cents)}.`;
    default: {
      const unreachable: never = reason;
      return unreachable;
    }
  }
};

/** `10% de desconto` / `R$ 50,00 de desconto`. */
export const couponBenefit = (coupon: Coupon): string =>
  coupon.discount.kind === "percent"
    ? `${coupon.discount.bps / 100}% de desconto`
    : `${formatCents(coupon.discount.cents)} de desconto`;
