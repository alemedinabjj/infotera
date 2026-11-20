import { renderHook } from "@testing-library/react";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { todayISO } from "@/shared/lib/dates";
import { useToday } from "./useToday";

const Probe = () => String(useToday());

describe("useToday", () => {
  it("no cliente devolve a data local de hoje", () => {
    vi.useFakeTimers({ now: new Date(2026, 11, 31, 23, 30) });
    const { result } = renderHook(() => useToday());
    expect(result.current).toBe("2026-12-31");
    expect(result.current).toBe(todayISO());
    vi.useRealTimers();
  });

  it("no servidor devolve null (sem mismatch de hidratação)", () => {
    expect(renderToString(createElement(Probe))).toBe("null");
  });
});
