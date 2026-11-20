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
      { text: "São", match: true, offset: 0 },
      { text: " Paulo, SP", match: false, offset: 3 },
    ]);
  });

  it("realça no meio e no fim", () => {
    expect(highlightMatch("Florianópolis, SC", "ianop")).toEqual([
      { text: "Flor", match: false, offset: 0 },
      { text: "ianóp", match: true, offset: 4 },
      { text: "olis, SC", match: false, offset: 9 },
    ]);
    expect(highlightMatch("Gramado, RS", "rs")).toEqual([
      { text: "Gramado, ", match: false, offset: 0 },
      { text: "RS", match: true, offset: 9 },
    ]);
  });

  it("sem match devolve o nome inteiro", () => {
    expect(highlightMatch("São Paulo, SP", "bra")).toEqual([
      { text: "São Paulo, SP", match: false, offset: 0 },
    ]);
  });

  it("query vazia não realça", () => {
    expect(highlightMatch("São Paulo, SP", "  ")).toEqual([
      { text: "São Paulo, SP", match: false, offset: 0 },
    ]);
  });

  it("nome inteiro casando devolve um único segmento marcado", () => {
    expect(highlightMatch("Natal", "natal")).toEqual([{ text: "Natal", match: true, offset: 0 }]);
  });

  it("a concatenação dos segmentos reconstrói o nome", () => {
    const segments = highlightMatch("Foz do Iguaçu, PR", "iguacu");
    expect(segments.map((s) => s.text).join("")).toBe("Foz do Iguaçu, PR");
    expect(segments.find((s) => s.match)?.text).toBe("Iguaçu");
  });

  it("offsets são únicos mesmo com trechos de texto repetido", () => {
    const segments = highlightMatch("aa", "a");
    const offsets = segments.map((segment) => segment.offset);
    expect(new Set(offsets).size).toBe(offsets.length);
    const repeated = highlightMatch("Rio Rio", "rio");
    expect(new Set(repeated.map((segment) => segment.offset)).size).toBe(repeated.length);
  });
});

describe("describeResultCount", () => {
  it("singular, plural e vazio", () => {
    expect(describeResultCount(1, "flor", "pt-BR")).toBe("1 destino encontrado");
    expect(describeResultCount(5, "bra", "pt-BR")).toBe("5 destinos encontrados");
    expect(describeResultCount(0, " xyz ", "pt-BR")).toBe('Nenhum destino encontrado para "xyz"');
  });
});
