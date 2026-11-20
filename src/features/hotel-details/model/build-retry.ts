/**
 * Esperas (ms) entre `attempts` tentativas: dobram a partir de `baseMs` e param em `maxMs`. Há uma
 * espera a menos que tentativas (não se espera depois da última).
 */
export const backoffDelays = (attempts: number, baseMs: number, maxMs: number): number[] =>
  Array.from({ length: Math.max(attempts - 1, 0) }, (_, index) =>
    Math.min(baseMs * 2 ** index, maxMs),
  );

export type RetryInfo = { attempt: number; total: number; error: unknown };

type RetryOptions = {
  /** Espera antes de cada nova tentativa; `delays.length + 1` é o total de tentativas. */
  delays: readonly number[];
  /** Injetado para os testes não usarem timers reais. */
  sleep: (ms: number) => Promise<void>;
  /** Chamado antes de dormir, com o número da tentativa que vem a seguir. */
  onRetry: (info: RetryInfo) => void;
};

/**
 * Executa `fn` até dar certo, esperando `delays[i]` entre as tentativas. Esgotadas, relança o erro
 * da última. Serve ao build: a mock-api no Render pode estar acordando (cold start).
 */
export const withRetry = async <T>(
  fn: () => Promise<T>,
  { delays, sleep, onRetry }: RetryOptions,
): Promise<T> => {
  const total = delays.length + 1;
  for (const [index, delay] of delays.entries()) {
    try {
      return await fn();
    } catch (error) {
      onRetry({ attempt: index + 2, total, error });
      await sleep(delay);
    }
  }
  return fn();
};
