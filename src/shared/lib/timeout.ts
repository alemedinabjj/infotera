/** Erro de `withTimeout`: a operação não respondeu no prazo (ela pode ter terminado depois). */
export class TimeoutError extends Error {
  constructor(ms: number) {
    super(`timeout após ${ms} ms`);
    this.name = "TimeoutError";
  }
}

/**
 * Rejeita com `TimeoutError` se `promise` não resolver em `ms`. Não cancela a operação (uma Server
 * Action não é abortável): quem chama precisa de retry idempotente.
 */
export const withTimeout = <T>(promise: Promise<T>, ms: number): Promise<T> =>
  new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new TimeoutError(ms)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
