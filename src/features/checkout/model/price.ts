import { reaisToCents } from "@/shared/lib/currency";
import {
  applyBps,
  ISS_BPS,
  type PriceLine,
  priceBreakdownLines,
  SERVICE_FEE_BPS,
} from "@/shared/lib/price-breakdown";

export type PriceDiscount = { code: string } & (
  | { kind: "percent"; bps: number }
  | { kind: "fixed"; cents: number }
);

export type PriceQuote = {
  nights: number;
  rooms: number;
  nightlyCents: number;
  subtotalCents: number;
  discountCents: number;
  serviceFeeCents: number;
  taxCents: number;
  totalCents: number;
  couponCode: string | null;
  lines: PriceLine[];
};

type PriceInput = {
  /** Diária em reais, sempre a de `room.pricePerNight` relida da API. */
  pricePerNight: number;
  nights: number;
  rooms: number;
  discount?: PriceDiscount | null;
};

const discountAmount = (discount: PriceDiscount, subtotalCents: number): number => {
  const raw = discount.kind === "percent" ? applyBps(subtotalCents, discount.bps) : discount.cents;
  return Math.min(Math.max(raw, 0), subtotalCents);
};

/**
 * Preço da reserva em centavos inteiros: `subtotal = diária × noites × quartos`, desconto, e taxa de
 * serviço + ISS sobre a base (`subtotal − desconto`). Pura: cliente e servidor usam a mesma conta.
 */
export const calculatePrice = ({
  pricePerNight,
  nights,
  rooms,
  discount = null,
}: PriceInput): PriceQuote => {
  const nightlyCents = reaisToCents(pricePerNight);
  const subtotalCents = nightlyCents * nights * rooms;
  const discountCents = discount ? discountAmount(discount, subtotalCents) : 0;
  const baseCents = subtotalCents - discountCents;
  const serviceFeeCents = applyBps(baseCents, SERVICE_FEE_BPS);
  const taxCents = applyBps(baseCents, ISS_BPS);

  const totalCents = baseCents + serviceFeeCents + taxCents;
  const couponCode = discount?.code ?? null;
  const lines = priceBreakdownLines({
    nightlyCents,
    nights,
    rooms,
    subtotalCents,
    discountCents,
    serviceFeeCents,
    taxCents,
    totalCents,
    ...(couponCode === null ? {} : { couponCode }),
  });

  return {
    nights,
    rooms,
    nightlyCents,
    subtotalCents,
    discountCents,
    serviceFeeCents,
    taxCents,
    totalCents,
    couponCode,
    lines,
  };
};
