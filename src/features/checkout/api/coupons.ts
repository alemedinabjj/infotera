import { queryOptions } from "@tanstack/react-query";
import { queryKeys } from "@/shared/api/query-keys";
import { type Coupon, findCoupon } from "../model/coupons";

/** Latência simulada do "endpoint" de cupom. */
export const COUPON_LATENCY_MS = 600;

/**
 * Consulta de cupom simulada (a mock-api não tem endpoint): resolve após `COUPON_LATENCY_MS` e
 * respeita o `AbortSignal` (trocar o código cancela a consulta anterior). `null` = não existe.
 */
export const lookupCoupon = (code: string, signal?: AbortSignal): Promise<Coupon | null> =>
  new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason);
      return;
    }
    const onAbort = () => {
      clearTimeout(timer);
      reject(signal?.reason);
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve(findCoupon(code));
    }, COUPON_LATENCY_MS);
    signal?.addEventListener("abort", onAbort, { once: true });
  });

/** Código já consultado volta do cache na hora (`staleTime: Infinity`), sem novo "Aplicando…". */
export const couponQueryOptions = (code: string) =>
  queryOptions({
    queryKey: queryKeys.coupons.detail(code),
    queryFn: ({ signal }) => lookupCoupon(code, signal),
    staleTime: Number.POSITIVE_INFINITY,
    retry: false,
  });
