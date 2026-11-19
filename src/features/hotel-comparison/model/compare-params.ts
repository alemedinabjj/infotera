import { MAX_COMPARE } from "@/shared/saved/model/comparison";

const POSITIVE_INT = /^[1-9]\d{0,8}$/;

/**
 * Ids da URL `?hotel=1&hotel=4`: ignora o que não é inteiro positivo, deduplica, preserva a ordem
 * e corta em 3. Tolerante: um link malformado ainda abre a comparação dos ids válidos.
 */
export const parseCompareParams = (params: URLSearchParams): number[] => {
  const seen = new Set<number>();
  for (const raw of params.getAll("hotel")) {
    if (seen.size === MAX_COMPARE) break;
    if (POSITIVE_INT.test(raw)) seen.add(Number(raw));
  }
  return [...seen];
};
