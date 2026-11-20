import { reaisToCents } from "@/shared/lib/currency";

/** Taxa de serviço (10%) e ISS (5%), em basis points, sobre a base já com desconto. */
export const SERVICE_FEE_BPS = 1000;
export const ISS_BPS = 500;

const BPS_DENOMINATOR = 10_000;

/** Percentual em bps com arredondamento half-up, só em aritmética inteira. */
export const applyBps = (cents: number, bps: number): number =>
  Math.floor((cents * bps + BPS_DENOMINATOR / 2) / BPS_DENOMINATOR);

export type PriceDiscount = { code: string } & (
  | { kind: "percent"; bps: number }
  | { kind: "fixed"; cents: number }
);

export type PriceLine =
  | { kind: "stay"; nightlyCents: number; nights: number; rooms: number; amountCents: number }
  | { kind: "discount"; code: string; amountCents: number }
  | { kind: "service-fee"; bps: number; amountCents: number }
  | { kind: "tax"; bps: number; amountCents: number };

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

  const lines: PriceLine[] = [
    { kind: "stay", nightlyCents, nights, rooms, amountCents: subtotalCents },
    ...(discount
      ? [{ kind: "discount" as const, code: discount.code, amountCents: discountCents }]
      : []),
    { kind: "service-fee", bps: SERVICE_FEE_BPS, amountCents: serviceFeeCents },
    { kind: "tax", bps: ISS_BPS, amountCents: taxCents },
  ];

  return {
    nights,
    rooms,
    nightlyCents,
    subtotalCents,
    discountCents,
    serviceFeeCents,
    taxCents,
    totalCents: baseCents + serviceFeeCents + taxCents,
    couponCode: discount?.code ?? null,
    lines,
  };
};
