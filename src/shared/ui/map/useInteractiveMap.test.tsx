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

  const failFirstLoad = async () => {
    loadInteractiveMap.mockRejectedValueOnce(new Error("chunk"));
    const hook = renderHook(() => useInteractiveMap(true));
    await waitFor(() => expect(hook.result.current.status).toBe("error"));
    const current = hook.result.current;
    if (current.status !== "error") throw new Error("esperava erro");
    return { ...hook, retry: current.retry };
  };

  it("falha do chunk vira erro com retry disponível", async () => {
    const { result } = await failFirstLoad();
    expect(result.current).toMatchObject({ status: "error", retrying: false });
  });

  it("retry pede o chunk de novo no mesmo lugar e, se der certo, vira ready sem recarregar", async () => {
    const reload = vi.spyOn(navigation, "reloadPage").mockImplementation(() => undefined);
    const { result, retry } = await failFirstLoad();
    loadInteractiveMap.mockResolvedValueOnce(FakeMap);
    act(() => retry());
    expect(result.current).toMatchObject({ status: "error", retrying: true });
    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(reload).not.toHaveBeenCalled();
  });

  it("se o retry falhar de novo (o runtime guarda a rejeição), recarrega a página", async () => {
    const reload = vi.spyOn(navigation, "reloadPage").mockImplementation(() => undefined);
    const { retry } = await failFirstLoad();
    loadInteractiveMap.mockRejectedValueOnce(new Error("chunk"));
    act(() => retry());
    await waitFor(() => expect(reload).toHaveBeenCalledTimes(1));
  });
});
