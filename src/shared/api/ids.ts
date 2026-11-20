/** Ids canônicos para a query e para a chave: inteiros positivos, sem repetição, em ordem. */
export const canonicalIds = (ids: readonly number[]): number[] =>
  [...new Set(ids.filter((id) => Number.isInteger(id) && id > 0))].sort((a, b) => a - b);

/** Ids pedidos que a API não devolveu (`GET /hotels?id=…` omite os inexistentes). */
export const missingIds = (
  requested: readonly number[],
  returned: readonly { id: number }[],
): number[] => {
  const found = new Set(returned.map((item) => item.id));
  return canonicalIds(requested).filter((id) => !found.has(id));
};

/** Itens na ordem dos ids pedidos (a API não garante a ordem); ids sem item somem. */
export const orderByIds = <T extends { id: number }>(
  items: readonly T[],
  ids: readonly number[],
): T[] =>
  ids.flatMap((id) => {
    const found = items.find((item) => item.id === id);
    return found ? [found] : [];
  });
