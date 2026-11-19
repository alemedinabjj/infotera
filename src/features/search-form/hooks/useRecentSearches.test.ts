import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SearchCriteria } from "@/shared/lib/search-params";
import { useRecentSearches } from "./useRecentSearches";

const KEY = "infotera:recent-searches";
const make = (destination: string): SearchCriteria => ({
  destination,
  checkIn: "2026-12-12",
  checkOut: "2026-12-15",
  rooms: 1,
  adults: 2,
  children: 0,
});

beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());

describe("useRecentSearches", () => {
  it("lê o que está salvo, descartando itens inválidos", () => {
    localStorage.setItem(KEY, JSON.stringify([make("Gramado, RS"), { lixo: true }]));
    const { result } = renderHook(() => useRecentSearches());
    expect(result.current.items).toEqual([make("Gramado, RS")]);
  });

  it("add grava no topo sem duplicar", () => {
    const { result } = renderHook(() => useRecentSearches());
    act(() => result.current.add(make("A, SP")));
    act(() => result.current.add(make("B, SP")));
    act(() => result.current.add(make("A, SP")));
    expect(result.current.items.map((i) => i.destination)).toEqual(["A, SP", "B, SP"]);
    expect(JSON.parse(localStorage.getItem(KEY) ?? "[]")).toHaveLength(2);
  });

  it("clear esvazia lista e storage", () => {
    localStorage.setItem(KEY, JSON.stringify([make("A, SP")]));
    const { result } = renderHook(() => useRecentSearches());
    act(() => result.current.clear());
    expect(result.current.items).toEqual([]);
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it("JSON corrompido vira lista vazia", () => {
    localStorage.setItem(KEY, "{nao-json");
    const { result } = renderHook(() => useRecentSearches());
    expect(result.current.items).toEqual([]);
  });

  it("sobrevive a storage que lança", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota");
    });
    const { result } = renderHook(() => useRecentSearches());
    expect(result.current.items).toEqual([]);
    expect(() => act(() => result.current.add(make("A, SP")))).not.toThrow();
    expect(result.current.items).toEqual([]);
  });
});
