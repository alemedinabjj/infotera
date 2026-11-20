import { act, renderHook } from "@testing-library/react";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useOnline } from "./useOnline";

const setOnLine = (value: boolean) =>
  vi.spyOn(window.navigator, "onLine", "get").mockReturnValue(value);

const Probe = () => String(useOnline());

describe("useOnline", () => {
  afterEach(() => vi.restoreAllMocks());

  it("acompanha os eventos online/offline", () => {
    setOnLine(true);
    const { result } = renderHook(() => useOnline());
    expect(result.current).toBe(true);
    act(() => {
      setOnLine(false);
      window.dispatchEvent(new Event("offline"));
    });
    expect(result.current).toBe(false);
    act(() => {
      setOnLine(true);
      window.dispatchEvent(new Event("online"));
    });
    expect(result.current).toBe(true);
  });

  it("no servidor assume online", () => {
    expect(renderToString(createElement(Probe))).toBe("true");
  });
});
