import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { setTestUrl } from "@/shared/testing/next-navigation";
import { useSearchFilters } from "./useSearchFilters";

vi.mock(
  "next/navigation",
  async () => (await import("@/shared/testing/next-navigation")).navigationMock,
);

const CRITERIA =
  "destination=Rio+de+Janeiro%2C+RJ&checkIn=2026-12-12&checkOut=2026-12-15&rooms=1&adults=2&children=0";

describe("useSearchFilters", () => {
  it("lê os filtros da URL", () => {
    setTestUrl(`/search?${CRITERIA}&minRating=4.5&amenity=pool&sort=price-asc&page=2`);
    const { result } = renderHook(() => useSearchFilters());
    expect(result.current.filters).toMatchObject({
      minRating: 4.5,
      amenities: ["pool"],
      sort: "price-asc",
      page: 2,
    });
  });

  it("update grava a URL canônica, preserva critérios e zera a página", () => {
    setTestUrl(`/search?${CRITERIA}&page=2`);
    const replaceState = vi.spyOn(window.history, "replaceState");
    const { result } = renderHook(() => useSearchFilters());
    act(() => result.current.update({ type: "toggleAmenity", value: "spa" }));
    act(() => result.current.update({ type: "toggleAmenity", value: "pool" }));
    expect(window.location.search).toBe(`?${CRITERIA}&amenity=pool&amenity=spa`);
    expect(result.current.filters.amenities).toEqual(["pool", "spa"]);
    expect(replaceState).toHaveBeenCalled();
  });

  it("sem filtros a URL fica só com os critérios", () => {
    setTestUrl(`/search?${CRITERIA}&sort=price-asc`);
    const { result } = renderHook(() => useSearchFilters());
    act(() => result.current.update({ type: "setSort", value: "popular" }));
    expect(window.location.search).toBe(`?${CRITERIA}`);
  });

  it("pageHref mantém critérios e filtros e só troca a página", () => {
    setTestUrl(`/search?${CRITERIA}&type=hotel`);
    const { result } = renderHook(() => useSearchFilters());
    expect(result.current.pageHref(2)).toBe(`/search?${CRITERIA}&type=hotel&page=2`);
    expect(result.current.pageHref(1)).toBe(`/search?${CRITERIA}&type=hotel`);
  });

  it("replacePage troca a página sem nova entrada no histórico", () => {
    setTestUrl(`/search?${CRITERIA}&page=5`);
    const length = window.history.length;
    const { result } = renderHook(() => useSearchFilters());
    act(() => result.current.replacePage(2));
    expect(window.location.search).toBe(`?${CRITERIA}&page=2`);
    expect(window.history.length).toBe(length);
  });

  it("reage a popstate (Voltar)", () => {
    setTestUrl(`/search?${CRITERIA}`);
    const { result } = renderHook(() => useSearchFilters());
    act(() => {
      window.history.replaceState(null, "", `/search?${CRITERIA}&minRating=4`);
      window.dispatchEvent(new PopStateEvent("popstate"));
    });
    expect(result.current.filters.minRating).toBe(4);
  });
});
