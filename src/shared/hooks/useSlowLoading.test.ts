import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SLOW_LOADING_MS, useSlowLoading } from "./useSlowLoading";

describe("useSlowLoading", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("vira true só depois do atraso em loading", () => {
    const { result } = renderHook(() => useSlowLoading(true));
    expect(result.current).toBe(false);
    act(() => vi.advanceTimersByTime(SLOW_LOADING_MS - 1));
    expect(result.current).toBe(false);
    act(() => vi.advanceTimersByTime(1));
    expect(result.current).toBe(true);
  });

  it("volta a false quando o loading acaba", () => {
    const { result, rerender } = renderHook(({ loading }) => useSlowLoading(loading), {
      initialProps: { loading: true },
    });
    act(() => vi.advanceTimersByTime(SLOW_LOADING_MS));
    expect(result.current).toBe(true);
    rerender({ loading: false });
    expect(result.current).toBe(false);
  });

  it("sem loading nunca fica lento", () => {
    const { result } = renderHook(() => useSlowLoading(false));
    act(() => vi.advanceTimersByTime(SLOW_LOADING_MS * 2));
    expect(result.current).toBe(false);
  });
});
