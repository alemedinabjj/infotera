import { describe, expect, it } from "vitest";
import { centsToReais, formatBRL, reaisToCents } from "./currency";

const normalize = (value: string): string => value.replace(/ /g, " ");

describe("formatBRL", () => {
  it("formata com centavos e NBSP", () => {
    const result = formatBRL(1200);
    expect(result).toContain(" ");
    expect(normalize(result)).toBe("R$ 1.200,00");
  });

  it("omite centavos quando pedido", () => {
    expect(normalize(formatBRL(1200, { cents: false }))).toBe("R$ 1.200");
  });

  it("formata valores grandes e zero", () => {
    expect(normalize(formatBRL(300000))).toBe("R$ 300.000,00");
    expect(normalize(formatBRL(0))).toBe("R$ 0,00");
  });
});

describe("reaisToCents / centsToReais", () => {
  it("arredonda sem erro de ponto flutuante", () => {
    expect(reaisToCents(19.99)).toBe(1999);
    expect(reaisToCents(0.1 + 0.2)).toBe(30);
  });

  it("converte de volta", () => {
    expect(centsToReais(1999)).toBe(19.99);
  });
});
