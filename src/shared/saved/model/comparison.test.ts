import { describe, expect, it } from "vitest";
import {
  type CompareEntry,
  compareHref,
  MAX_COMPARE,
  sanitizeComparison,
  toggleCompare,
} from "./comparison";

const entry = (id: number, name = `Hotel ${id}`): CompareEntry => ({ id, name });

describe("toggleCompare", () => {
  it("adiciona na ordem de inclusão", () => {
    const { list, result } = toggleCompare([entry(1)], entry(4));
    expect(result).toBe("added");
    expect(list.map((item) => item.id)).toEqual([1, 4]);
  });

  it("remove quando já está na lista", () => {
    const { list, result } = toggleCompare([entry(1), entry(4)], entry(1));
    expect(result).toBe("removed");
    expect(list.map((item) => item.id)).toEqual([4]);
  });

  it("o 4º hotel é recusado e a lista não muda", () => {
    const three = [entry(1), entry(4), entry(7)];
    const { list, result } = toggleCompare(three, entry(9));
    expect(result).toBe("full");
    expect(list).toEqual(three);
    expect(MAX_COMPARE).toBe(3);
  });

  it("com 3 ainda permite remover", () => {
    expect(toggleCompare([entry(1), entry(4), entry(7)], entry(4)).result).toBe("removed");
  });
});

describe("sanitizeComparison", () => {
  it("descarta inválidos, deduplica e corta em 3 mantendo a ordem", () => {
    const raw = [
      entry(1),
      { id: 0, name: "zero" },
      { id: 2, name: "" },
      { id: 3, name: "x".repeat(500) },
      entry(1, "repetido"),
      "lixo",
      entry(4),
      entry(7),
      entry(9),
    ];
    expect(sanitizeComparison(raw).map((item) => item.id)).toEqual([1, 4, 7]);
  });

  it.each([null, "x", 3, {}])("%s vira vazio", (raw) => {
    expect(sanitizeComparison(raw)).toEqual([]);
  });
});

describe("compareHref", () => {
  it("repete o parâmetro hotel na ordem dada", () => {
    expect(compareHref([1, 4, 7])).toBe("/compare?hotel=1&hotel=4&hotel=7");
  });

  it("sem ids aponta para a página vazia", () => {
    expect(compareHref([])).toBe("/compare");
  });
});

describe("compareHref com critérios", () => {
  const criteria = {
    destination: "Rio de Janeiro, RJ",
    checkIn: "2030-01-10",
    checkOut: "2030-01-13",
    rooms: 1,
    adults: 2,
    children: 0,
  } as const;

  it("leva os critérios da busca de origem depois dos hotéis", () => {
    expect(compareHref([1, 4], criteria)).toBe(
      "/compare?hotel=1&hotel=4&destination=Rio+de+Janeiro%2C+RJ&checkIn=2030-01-10&checkOut=2030-01-13&rooms=1&adults=2&children=0",
    );
  });

  it("sem critérios (ou sem hotéis) o link é o simples", () => {
    expect(compareHref([1, 4], null)).toBe("/compare?hotel=1&hotel=4");
    expect(compareHref([], criteria)).toBe("/compare");
  });
});
