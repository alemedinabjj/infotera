import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useDebouncedValue } from "./useDebouncedValue";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("useDebouncedValue", () => {
  it("começa com o valor inicial e só troca após 300 ms sem mudança", () => {
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value), {
      initialProps: { value: "a" },
    });
    expect(result.current).toBe("a");
    rerender({ value: "ab" });
    act(() => vi.advanceTimersByTime(299));
    expect(result.current).toBe("a");
    act(() => vi.advanceTimersByTime(1));
    expect(result.current).toBe("ab");
  });

  it("digitação rápida reinicia o prazo e aplica só o último valor", () => {
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value), {
      initialProps: { value: "" },
    });
    for (const value of ["f", "fl", "flo", "flor"]) {
      rerender({ value });
      act(() => vi.advanceTimersByTime(100));
    }
    expect(result.current).toBe("");
    act(() => vi.advanceTimersByTime(200));
    expect(result.current).toBe("flor");
  });
});
