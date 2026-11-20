import { describe, expect, it } from "vitest";
import { centsToReais, formatBRL, reaisToCents } from "./currency";

const normalize = (value: string): string => value.replace(/ /g, " ");

describe("formatBRL", () => {
  it("formata com centavos e NBSP", () => {
    const result = formatBRL(1200, { locale: "pt-BR" });
    expect(result).toContain(" ");
    expect(normalize(result)).toBe("R$ 1.200,00");
  });

  it("omite centavos quando pedido", () => {
    expect(normalize(formatBRL(1200, { locale: "pt-BR", cents: false }))).toBe("R$ 1.200");
  });

  it("formata valores grandes e zero", () => {
    expect(normalize(formatBRL(300000, { locale: "pt-BR" }))).toBe("R$ 300.000,00");
    expect(normalize(formatBRL(0, { locale: "pt-BR" }))).toBe("R$ 0,00");
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

describe("formatBRL por idioma", () => {
  it("en-US usa o padrão americano sem converter a moeda", () => {
    expect(formatBRL(1200, { locale: "en-US" })).toBe("R$1,200.00");
    expect(formatBRL(1200, { locale: "en-US", cents: false })).toBe("R$1,200");
    expect(formatBRL(0, { locale: "en-US" })).toBe("R$0.00");
  });

  it("pt-BR explícito é igual ao padrão", () => {
    expect(formatBRL(1200, { locale: "pt-BR" })).toBe(formatBRL(1200, { locale: "pt-BR" }));
  });
});
