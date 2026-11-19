import { describe, expect, it } from "vitest";
import { getPaginationRange, getTotalPages } from "./pagination";

describe("getTotalPages", () => {
  it("arredonda para cima e zera sem itens", () => {
    expect(getTotalPages(14, 10)).toBe(2);
    expect(getTotalPages(10, 10)).toBe(1);
    expect(getTotalPages(0, 10)).toBe(0);
    expect(getTotalPages(5, 0)).toBe(0);
  });
});

describe("getPaginationRange", () => {
  it("mostra todas com 7 ou menos páginas", () => {
    expect(getPaginationRange({ page: 1, totalPages: 1 })).toEqual([1]);
    expect(getPaginationRange({ page: 3, totalPages: 7 })).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(getPaginationRange({ page: 1, totalPages: 0 })).toEqual([]);
  });

  it("usa reticências dos dois lados no meio", () => {
    expect(getPaginationRange({ page: 5, totalPages: 10 })).toEqual([
      1,
      "ellipsis",
      4,
      5,
      6,
      "ellipsis",
      10,
    ]);
  });

  it("mantém 7 itens perto do início e do fim", () => {
    expect(getPaginationRange({ page: 1, totalPages: 10 })).toEqual([
      1,
      2,
      3,
      4,
      5,
      "ellipsis",
      10,
    ]);
    expect(getPaginationRange({ page: 4, totalPages: 8 })).toEqual([1, 2, 3, 4, 5, "ellipsis", 8]);
    expect(getPaginationRange({ page: 10, totalPages: 10 })).toEqual([
      1,
      "ellipsis",
      6,
      7,
      8,
      9,
      10,
    ]);
    expect(getPaginationRange({ page: 7, totalPages: 10 })).toEqual([
      1,
      "ellipsis",
      6,
      7,
      8,
      9,
      10,
    ]);
  });

  it("limita página fora do intervalo", () => {
    expect(getPaginationRange({ page: 99, totalPages: 10 })).toEqual([
      1,
      "ellipsis",
      6,
      7,
      8,
      9,
      10,
    ]);
  });
});
