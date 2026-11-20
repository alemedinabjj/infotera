import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as navigation from "../../lib/navigation";
import { useInteractiveMap } from "./useInteractiveMap";

const loadInteractiveMap = vi.hoisted(() => vi.fn());
vi.mock("./loader", () => ({ loadInteractiveMap }));

const FakeMap = () => null;

describe("useInteractiveMap", () => {
  beforeEach(() => {
    loadInteractiveMap.mockReset();
  });

  it("desligado: não pede o chunk", () => {
    const { result } = renderHook(() => useInteractiveMap(false));
    expect(result.current).toEqual({ status: "idle" });
    expect(loadInteractiveMap).not.toHaveBeenCalled();
  });

  it("ligado: loading e depois ready com o componente", async () => {
    loadInteractiveMap.mockResolvedValue(FakeMap);
    const { result } = renderHook(() => useInteractiveMap(true));
    expect(result.current.status).toBe("loading");
    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(result.current).toEqual({ status: "ready", Map: FakeMap });
  });

  it("falha do chunk vira erro e o retry recarrega a página (o runtime não repete import() rejeitado)", async () => {
    const reload = vi.spyOn(navigation, "reloadPage").mockImplementation(() => undefined);
    loadInteractiveMap.mockRejectedValueOnce(new Error("chunk"));
    const { result } = renderHook(() => useInteractiveMap(true));
    await waitFor(() => expect(result.current.status).toBe("error"));
    const current = result.current;
    if (current.status !== "error") throw new Error("esperava erro");
    act(() => current.retry());
    expect(reload).toHaveBeenCalledTimes(1);
    expect(loadInteractiveMap).toHaveBeenCalledTimes(1);
  });
});
