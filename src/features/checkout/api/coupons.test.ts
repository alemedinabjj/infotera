import { QueryClient } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { queryKeys } from "@/shared/api/query-keys";
import { COUPON_LATENCY_MS, couponQueryOptions, lookupCoupon } from "./coupons";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("lookupCoupon", () => {
  it("resolve depois de 600 ms", async () => {
    const result = vi.fn<(value: unknown) => void>();
    void lookupCoupon("BEMVINDO10").then(result);
    await vi.advanceTimersByTimeAsync(COUPON_LATENCY_MS - 1);
    expect(result).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(result).toHaveBeenCalledWith(expect.objectContaining({ code: "BEMVINDO10" }));
  });

  it("código desconhecido resolve null", async () => {
    const promise = lookupCoupon("NAOEXISTE");
    await vi.advanceTimersByTimeAsync(COUPON_LATENCY_MS);
    await expect(promise).resolves.toBeNull();
  });

  it("rejeita ao abortar e não resolve depois", async () => {
    const controller = new AbortController();
    const promise = lookupCoupon("BEMVINDO10", controller.signal);
    const settled = expect(promise).rejects.toBeDefined();
    controller.abort();
    await settled;
    await vi.advanceTimersByTimeAsync(COUPON_LATENCY_MS);
  });

  it("já abortado rejeita na hora", async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(lookupCoupon("BEMVINDO10", controller.signal)).rejects.toBeDefined();
  });
});

describe("couponQueryOptions", () => {
  it("usa a chave de shared, sem retry e cache infinito", () => {
    const options = couponQueryOptions("BEMVINDO10");
    expect(options.queryKey).toEqual(queryKeys.coupons.detail("BEMVINDO10"));
    expect(options.retry).toBe(false);
    expect(options.staleTime).toBe(Number.POSITIVE_INFINITY);
  });

  it("reaplicar o mesmo código usa o cache (uma só consulta)", async () => {
    const client = new QueryClient();
    const first = client.fetchQuery(couponQueryOptions("BEMVINDO10"));
    await vi.advanceTimersByTimeAsync(COUPON_LATENCY_MS);
    await first;
    const start = Date.now();
    await client.fetchQuery(couponQueryOptions("BEMVINDO10"));
    expect(Date.now() - start).toBe(0);
  });
});
