import { isApiError } from "@/shared/api/http";

/** Resultado de um dado de catálogo que pode falhar sem derrubar a página. */
export type Settled<T> = { kind: "ok"; value: T } | { kind: "error" };

/** De onde veio a falha, para o log (sem corpo nem mensagem da API). */
export type SettleContext = { resource: string; hotelId: number };

const logFailure = ({ resource, hotelId }: SettleContext, error: unknown): void => {
  console.warn("[hotel-details] catalog request failed", {
    resource,
    hotelId,
    kind: isApiError(error) ? error.kind : "unknown",
    status: isApiError(error) ? error.status : null,
  });
};

/**
 * Resolve uma promessa para `Settled`, **fora** do escopo `"use cache"`: o erro volta como dado
 * (nunca o texto da API) e quem renderiza decide o que mostrar. Uma falha de quartos ou de
 * comentários vira um erro de seção, não a página inteira. A falha vai para o log do servidor só com
 * recurso, id do hotel e tipo/status do `ApiError` (nunca o corpo nem a mensagem da API).
 */
export const settle = <T>(promise: Promise<T>, context: SettleContext): Promise<Settled<T>> =>
  promise.then(
    (value): Settled<T> => ({ kind: "ok", value }),
    (error: unknown): Settled<T> => {
      logFailure(context, error);
      return { kind: "error" };
    },
  );
