import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "./http";
import { hotelQueryOptions } from "./queries";
import { makeQueryClient, retryDelay, shouldRetry } from "./query-client";

describe("shouldRetry", () => {
  it.each([400, 404, 422])("não repete http %i", (status) => {
    expect(shouldRetry(0, new ApiError("http", status, "x"))).toBe(false);
  });

  it("não repete parse", () => {
    expect(shouldRetry(0, new ApiError("parse", 200, "x"))).toBe(false);
  });

  it.each([
    new ApiError("http", 500, "x"),
    new ApiError("network", null, "x"),
    new ApiError("timeout", null, "x"),
  ])("repete $kind enquanto failureCount < 2", (error) => {
    expect(shouldRetry(0, error)).toBe(true);
    expect(shouldRetry(1, error)).toBe(true);
    expect(shouldRetry(2, error)).toBe(false);
  });
});

describe("retryDelay", () => {
  it("cresce exponencialmente com teto de 8s", () => {
    expect([0, 1, 2, 3, 4].map(retryDelay)).toEqual([1000, 2000, 4000, 8000, 8000]);
  });
});

describe("makeQueryClient", () => {
  it("aplica os defaults", () => {
    const defaults = makeQueryClient().getDefaultOptions();
    expect(defaults.queries?.staleTime).toBe(60_000);
    expect(defaults.queries?.refetchOnWindowFocus).toBe(false);
    expect(defaults.mutations?.retry).toBe(0);
  });
});

describe("hotelQueryOptions", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("usa a chave de detalhe e busca o hotel", async () => {
    const options = hotelQueryOptions(1);
    expect(options.queryKey).toEqual(["hotels", "detail", 1]);
    const fetchMock = vi.fn<typeof fetch>(async () => new Response("{}", { status: 404 }));
    vi.stubGlobal("fetch", fetchMock);
    const controller = new AbortController();
    await expect(
      options.queryFn?.({
        queryKey: options.queryKey,
        signal: controller.signal,
        client: makeQueryClient(),
        meta: undefined,
      }),
    ).rejects.toMatchObject({ kind: "http", status: 404 });
    expect(fetchMock.mock.calls[0]?.[0]).toBe("http://api.test/hotels/1");
  });
});

describe("makeQueryClient no browser", () => {
  it("usa shouldRetry", () => {
    expect(makeQueryClient().getDefaultOptions().queries?.retry).toBe(shouldRetry);
  });
});
