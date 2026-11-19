import { defaultShouldDehydrateQuery, isServer, QueryClient } from "@tanstack/react-query";
import { isApiError } from "./http";

const MAX_RETRIES = 2;

/** Sem retry para 4xx e respostas fora do contrato; senão até 2 tentativas. */
export const shouldRetry = (failureCount: number, error: unknown): boolean => {
  if (isApiError(error)) {
    if (error.kind === "parse") return false;
    if (
      error.kind === "http" &&
      error.status !== null &&
      error.status >= 400 &&
      error.status < 500
    ) {
      return false;
    }
  }
  return failureCount < MAX_RETRIES;
};

/** Backoff exponencial: 1s, 2s, 4s, 8s (teto). */
export const retryDelay = (attempt: number): number => Math.min(1000 * 2 ** attempt, 8000);

export const makeQueryClient = (): QueryClient =>
  new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        retry: shouldRetry,
        retryDelay,
        refetchOnWindowFocus: false,
      },
      // POST /bookings não é idempotente: retry automático duplicaria a reserva.
      mutations: { retry: 0 },
      dehydrate: {
        shouldDehydrateQuery: (query) =>
          defaultShouldDehydrateQuery(query) || query.state.status === "pending",
      },
    },
  });

let browserQueryClient: QueryClient | undefined;

/** Browser: singleton. Servidor: um novo por chamada (use `getServerQueryClient` em RSC). */
export const getQueryClient = (): QueryClient => {
  if (isServer) return makeQueryClient();
  browserQueryClient ??= makeQueryClient();
  return browserQueryClient;
};
