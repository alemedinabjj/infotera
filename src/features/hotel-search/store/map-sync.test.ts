import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetMapSync, useIsActiveHotel, useMapSync } from "./map-sync";

describe("map-sync", () => {
  beforeEach(() => resetMapSync());

  it("hover/foco liga e desliga o destaque", () => {
    useMapSync.getState().setActive(3);
    expect(useMapSync.getState().activeHotelId).toBe(3);
    useMapSync.getState().setActive(null);
    expect(useMapSync.getState().activeHotelId).toBeNull();
  });

  it("o seletor por id só muda para o hotel afetado (sem re-render dos demais)", () => {
    const renders = { a: 0, b: 0 };
    const a = renderHook(() => {
      renders.a += 1;
      return useIsActiveHotel(1);
    });
    const b = renderHook(() => {
      renders.b += 1;
      return useIsActiveHotel(2);
    });
    expect([a.result.current, b.result.current]).toEqual([false, false]);
    const before = { ...renders };
    act(() => useMapSync.getState().setActive(1));
    expect([a.result.current, b.result.current]).toEqual([true, false]);
    expect(renders.a).toBe(before.a + 1);
    expect(renders.b).toBe(before.b);
    act(() => useMapSync.getState().setActive(2));
    expect([a.result.current, b.result.current]).toEqual([false, true]);
  });

  it("registra e remove o callback de revelar o card", () => {
    const reveal = vi.fn();
    useMapSync.getState().registerReveal(reveal);
    useMapSync.getState().revealCard?.(5);
    expect(reveal).toHaveBeenCalledWith(5);
    useMapSync.getState().registerReveal(null);
    expect(useMapSync.getState().revealCard).toBeNull();
  });

  it("resetMapSync volta ao estado inicial", () => {
    useMapSync.getState().setActive(9);
    useMapSync.getState().registerReveal(() => undefined);
    resetMapSync();
    expect(useMapSync.getState()).toMatchObject({ activeHotelId: null, revealCard: null });
  });
});
