/** Resultado de um dado de catálogo que pode falhar sem derrubar a página. */
export type Settled<T> = { kind: "ok"; value: T } | { kind: "error" };

/**
 * Resolve uma promessa para `Settled`, **fora** do escopo `"use cache"`: o erro volta como dado
 * (nunca o texto da API) e quem renderiza decide o que mostrar. Uma falha de quartos ou de
 * comentários vira um erro de seção, não a página inteira.
 */
export const settle = <T>(promise: Promise<T>): Promise<Settled<T>> =>
  promise.then(
    (value): Settled<T> => ({ kind: "ok", value }),
    (): Settled<T> => ({ kind: "error" }),
  );
