import { describe, expect, it } from "vitest";
import { describeResultCount, highlightMatch, normalizeQuery } from "./suggestion-text";

describe("normalizeQuery", () => {
  it.each([
    ["São", "sao"],
    ["  SAO Paulo ", "sao paulo"],
    ["Florianópolis", "florianopolis"],
    ["", ""],
    ["   ", ""],
  ])("%j → %j", (input, expected) => {
    expect(normalizeQuery(input)).toBe(expected);
  });

  it("trata a forma decomposta (NFD) como a composta", () => {
    expect(normalizeQuery("São")).toBe("sao");
  });
});

describe("highlightMatch", () => {
  it("ignora acento e caixa", () => {
    expect(highlightMatch("São Paulo, SP", "sao")).toEqual([
      { text: "São", match: true },
      { text: " Paulo, SP", match: false },
    ]);
  });

  it("realça no meio e no fim", () => {
    expect(highlightMatch("Florianópolis, SC", "ianop")).toEqual([
      { text: "Flor", match: false },
      { text: "ianóp", match: true },
      { text: "olis, SC", match: false },
    ]);
    expect(highlightMatch("Gramado, RS", "rs")).toEqual([
      { text: "Gramado, ", match: false },
      { text: "RS", match: true },
    ]);
  });

  it("sem match devolve o nome inteiro", () => {
    expect(highlightMatch("São Paulo, SP", "bra")).toEqual([
      { text: "São Paulo, SP", match: false },
    ]);
  });

  it("query vazia não realça", () => {
    expect(highlightMatch("São Paulo, SP", "  ")).toEqual([
      { text: "São Paulo, SP", match: false },
    ]);
  });

  it("nome inteiro casando devolve um único segmento marcado", () => {
    expect(highlightMatch("Natal", "natal")).toEqual([{ text: "Natal", match: true }]);
  });

  it("a concatenação dos segmentos reconstrói o nome", () => {
    const segments = highlightMatch("Foz do Iguaçu, PR", "iguacu");
    expect(segments.map((s) => s.text).join("")).toBe("Foz do Iguaçu, PR");
    expect(segments.find((s) => s.match)?.text).toBe("Iguaçu");
  });
});

describe("describeResultCount", () => {
  it("singular, plural e vazio", () => {
    expect(describeResultCount(1, "flor")).toBe("1 destino encontrado");
    expect(describeResultCount(5, "bra")).toBe("5 destinos encontrados");
    expect(describeResultCount(0, " xyz ")).toBe('Nenhum destino encontrado para "xyz"');
  });
});
