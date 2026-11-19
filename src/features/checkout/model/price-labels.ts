import { centsToReais, formatBRL } from "@/shared/lib/currency";
import { pluralize } from "@/shared/lib/format";
import type { PriceLine } from "./price";

/** `R$ 1.200,00` a partir de centavos inteiros. */
export const formatCents = (cents: number): string => formatBRL(centsToReais(cents));

const percent = (bps: number): string => `${bps / 100}%`;

/** Rótulo de cada linha do detalhamento (switch exaustivo). */
export const priceLineLabel = (line: PriceLine): string => {
  switch (line.kind) {
    case "stay":
      return `${formatCents(line.nightlyCents)} × ${pluralize(line.nights, "noite", "noites")} × ${pluralize(line.rooms, "quarto", "quartos")}`;
    case "discount":
      return `Desconto (${line.code})`;
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

/** `3 noites · 1 quarto`, legenda do total na barra de ação. */
export const describeNightsAndRooms = (nights: number, rooms: number): string =>
  `${pluralize(nights, "noite", "noites")} · ${pluralize(rooms, "quarto", "quartos")}`;
