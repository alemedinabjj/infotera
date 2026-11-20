import { describe, expect, it } from "vitest";
import { canonicalIds, missingIds } from "./ids";

describe("canonicalIds", () => {
  it("deduplica, ordena e descarta o que não é inteiro positivo", () => {
    expect(canonicalIds([4, 1, 4, 0, -2, 1.5])).toEqual([1, 4]);
  });
});

describe("missingIds", () => {
  it("devolve só os pedidos que não voltaram", () => {
    expect(missingIds([1, 4, 999], [{ id: 1 }, { id: 4 }])).toEqual([999]);
    expect(missingIds([], [])).toEqual([]);
  });
});
