import type { PriceBreakdown } from "../api/schemas";
import { centsToReais, formatBRL, reaisToCents } from "./currency";
import { pluralize } from "./format";

/** Taxa de serviço (10%) e ISS (5%), em basis points, sobre a base já com desconto. */
export const SERVICE_FEE_BPS = 1000;
export const ISS_BPS = 500;

const BPS_DENOMINATOR = 10_000;

/** Percentual em bps com arredondamento half-up, só em aritmética inteira. */
export const applyBps = (cents: number, bps: number): number =>
  Math.floor((cents * bps + BPS_DENOMINATOR / 2) / BPS_DENOMINATOR);

/** Uma linha do detalhamento do preço. `code` é `null` quando o desconto não grava o cupom. */
export type PriceLine =
  | { kind: "stay"; nightlyCents: number; nights: number; rooms: number; amountCents: number }
  | { kind: "discount"; code: string | null; amountCents: number }
  | { kind: "service-fee"; bps: number; amountCents: number }
  | { kind: "tax"; bps: number; amountCents: number };

/** `R$ 1.200,00` a partir de centavos inteiros. */
export const formatCents = (cents: number): string => formatBRL(centsToReais(cents));

const percent = (bps: number): string => `${bps / 100}%`;

/** Rótulo de cada linha do detalhamento (switch exaustivo). */
export const priceLineLabel = (line: PriceLine): string => {
  switch (line.kind) {
    case "stay":
      return `${formatCents(line.nightlyCents)} × ${pluralize(line.nights, "noite", "noites")} × ${pluralize(line.rooms, "quarto", "quartos")}`;
    case "discount":
      return line.code === null ? "Desconto" : `Desconto (${line.code})`;
    case "service-fee":
      return `Taxa de serviço (${percent(line.bps)})`;
    case "tax":
      return `ISS (${percent(line.bps)})`;
    default: {
      const unreachable: never = line;
      return unreachable;
    }
  }
};

/** Valor da linha; o desconto leva o sinal `−` no texto (cor nunca sozinha). */
export const priceLineAmount = (line: PriceLine): string =>
  line.kind === "discount" ? `−${formatCents(line.amountCents)}` : formatCents(line.amountCents);

/**
 * Linhas do detalhamento na ordem fixa: estadia, desconto (só com `discountCents > 0`), taxa de
 * serviço e ISS. É a única fonte de ordem e rótulo, do checkout e da confirmação.
 */
export const priceBreakdownLines = (breakdown: PriceBreakdown): PriceLine[] => [
  {
    kind: "stay",
    nightlyCents: breakdown.nightlyCents,
    nights: breakdown.nights,
    rooms: breakdown.rooms,
    amountCents: breakdown.subtotalCents,
  },
  ...(breakdown.discountCents > 0
    ? [
        {
          kind: "discount" as const,
          code: breakdown.couponCode ?? null,
          amountCents: breakdown.discountCents,
        },
      ]
    : []),
  { kind: "service-fee", bps: SERVICE_FEE_BPS, amountCents: breakdown.serviceFeeCents },
  { kind: "tax", bps: ISS_BPS, amountCents: breakdown.taxCents },
];

/**
 * O detalhamento gravado só é confiável se fechar a conta: estadia = diária × noites × quartos,
 * taxa de serviço e ISS = `applyBps(base, ...)` com `base = estadia − desconto`, as linhas somam
 * `totalCents` e `totalCents` bate com `totalPrice` (reais) da reserva.
 */
export const isBreakdownConsistent = (breakdown: PriceBreakdown, totalPrice: number): boolean => {
  const stay = breakdown.nightlyCents * breakdown.nights * breakdown.rooms;
  const sum =
    breakdown.subtotalCents -
    breakdown.discountCents +
    breakdown.serviceFeeCents +
    breakdown.taxCents;
  const base = breakdown.subtotalCents - breakdown.discountCents;
  return (
    stay === breakdown.subtotalCents &&
    breakdown.serviceFeeCents === applyBps(base, SERVICE_FEE_BPS) &&
    breakdown.taxCents === applyBps(base, ISS_BPS) &&
    sum === breakdown.totalCents &&
    breakdown.totalCents === reaisToCents(totalPrice)
  );
};
