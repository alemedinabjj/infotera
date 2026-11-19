import { describe, expect, it } from "vitest";
import type { PriceBreakdown } from "../api/schemas";
import {
  isBreakdownConsistent,
  priceBreakdownLines,
  priceLineAmount,
  priceLineLabel,
} from "./price-breakdown";

const plain = (value: string) => value.replaceAll("\u00a0", " ");

/** R$ 1.200 × 3 noites × 1 quarto com BEMVINDO10 (exemplo da F5). */
const breakdown: PriceBreakdown = {
  nightlyCents: 120000,
  nights: 3,
  rooms: 1,
  subtotalCents: 360000,
  discountCents: 36000,
  serviceFeeCents: 32400,
  taxCents: 16200,
  totalCents: 372600,
  couponCode: "BEMVINDO10",
};

describe("priceLineLabel / priceLineAmount", () => {
  it("rótulos com singular e plural", () => {
    expect(
      plain(
        priceLineLabel({ kind: "stay", nightlyCents: 120000, nights: 3, rooms: 2, amountCents: 1 }),
      ),
    ).toBe("R$ 1.200,00 × 3 noites × 2 quartos");
    expect(
      plain(
        priceLineLabel({ kind: "stay", nightlyCents: 18000, nights: 1, rooms: 1, amountCents: 1 }),
      ),
    ).toBe("R$ 180,00 × 1 noite × 1 quarto");
    expect(priceLineLabel({ kind: "discount", code: "BEMVINDO10", amountCents: 1 })).toBe(
      "Desconto (BEMVINDO10)",
    );
    expect(priceLineLabel({ kind: "discount", code: null, amountCents: 1 })).toBe("Desconto");
    expect(priceLineLabel({ kind: "service-fee", bps: 1000, amountCents: 1 })).toBe(
      "Taxa de serviço (10%)",
    );
    expect(priceLineLabel({ kind: "tax", bps: 500, amountCents: 1 })).toBe("ISS (5%)");
  });

  it("o desconto leva o sinal de menos", () => {
    expect(plain(priceLineAmount({ kind: "discount", code: "ABCD", amountCents: 72000 }))).toBe(
      "−R$ 720,00",
    );
    expect(plain(priceLineAmount({ kind: "tax", bps: 500, amountCents: 64800 }))).toBe("R$ 648,00");
  });
});

describe("priceBreakdownLines", () => {
  it("ordem fixa e rótulos do exemplo com cupom", () => {
    const lines = priceBreakdownLines(breakdown);
    expect(lines.map((line) => line.kind)).toEqual(["stay", "discount", "service-fee", "tax"]);
    expect(lines.map((line) => plain(priceLineLabel(line)))).toEqual([
      "R$ 1.200,00 × 3 noites × 1 quarto",
      "Desconto (BEMVINDO10)",
      "Taxa de serviço (10%)",
      "ISS (5%)",
    ]);
    expect(lines.map((line) => plain(priceLineAmount(line)))).toEqual([
      "R$ 3.600,00",
      "−R$ 360,00",
      "R$ 324,00",
      "R$ 162,00",
    ]);
  });

  it("sem desconto não há linha de desconto", () => {
    const lines = priceBreakdownLines({ ...breakdown, discountCents: 0, couponCode: undefined });
    expect(lines.map((line) => line.kind)).toEqual(["stay", "service-fee", "tax"]);
  });

  it("desconto sem código de cupom fica sem o código", () => {
    const lines = priceBreakdownLines({ ...breakdown, couponCode: undefined });
    expect(lines[1] && priceLineLabel(lines[1])).toBe("Desconto");
  });
});

describe("isBreakdownConsistent", () => {
  it("aceita o detalhamento que fecha a conta", () => {
    expect(isBreakdownConsistent(breakdown, 3726)).toBe(true);
  });

  it.each<[string, Partial<PriceBreakdown>, number]>([
    ["soma das linhas diferente do total", { totalCents: 372601 }, 3726.01],
    ["total diferente de totalPrice", {}, 3000],
    ["estadia diferente de diária × noites × quartos", { subtotalCents: 360001 }, 3726],
    ["taxa adulterada", { taxCents: 1 }, 3726],
  ])("rejeita: %s", (_name, override, totalPrice) => {
    expect(isBreakdownConsistent({ ...breakdown, ...override }, totalPrice)).toBe(false);
  });
});
