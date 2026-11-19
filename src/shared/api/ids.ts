/** Ids canônicos para a query e para a chave: inteiros positivos, sem repetição, em ordem. */
export const canonicalIds = (ids: readonly number[]): number[] =>
  [...new Set(ids.filter((id) => Number.isInteger(id) && id > 0))].sort((a, b) => a - b);
