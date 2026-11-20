import { describe, expect, it } from "vitest";
import { describePriceSummary, movePriceThumb, priceValueText } from "./price-range";

/** O `formatBRL` separa `R$` do número com espaço não separável. */
const plain = (text: string): string => text.replaceAll("\u00a0", " ");

describe("movePriceThumb", () => {
  const draft = { min: 500, max: 1500 };

  it("move livremente dentro dos limites", () => {
    expect(movePriceThumb(draft, "min", 300)).toEqual({ min: 300, max: 1500 });
    expect(movePriceThumb(draft, "max", 2000)).toEqual({ min: 500, max: 2000 });
  });

  it("o mínimo nunca passa do máximo e vice-versa", () => {
    expect(movePriceThumb(draft, "min", 2500)).toEqual({ min: 1500, max: 1500 });
    expect(movePriceThumb(draft, "max", 100)).toEqual({ min: 500, max: 500 });
  });

  it("limita ao domínio 0–3.000", () => {
    expect(movePriceThumb(draft, "min", -50)).toEqual({ min: 0, max: 1500 });
    expect(movePriceThumb(draft, "max", 9000)).toEqual({ min: 500, max: 3000 });
  });
});

describe("priceValueText", () => {
  it("formata em reais sem centavos", () => {
    expect(plain(priceValueText("min", 500))).toBe("R$ 500");
    expect(plain(priceValueText("max", 500))).toBe("R$ 500");
  });

  it("o topo do máximo é 'ou mais'", () => {
    expect(plain(priceValueText("max", 3000))).toBe("R$ 3.000 ou mais");
    expect(plain(priceValueText("min", 3000))).toBe("R$ 3.000");
  });
});

describe("describePriceSummary", () => {
  it("cobre as quatro frases", () => {
    expect(plain(describePriceSummary({ min: 0, max: 3000 }))).toBe("Qualquer preço");
    expect(plain(describePriceSummary({ min: 200, max: 3000 }))).toBe("A partir de R$ 200");
    expect(plain(describePriceSummary({ min: 0, max: 1500 }))).toBe("Até R$ 1.500");
    expect(plain(describePriceSummary({ min: 200, max: 1500 }))).toBe("R$ 200 – R$ 1.500");
  });
});
