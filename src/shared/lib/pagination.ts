export type PaginationItem = number | "ellipsis-start" | "ellipsis-end";

const MAX_VISIBLE_PAGES = 7;

/** Total de páginas; `0` quando não há itens. */
export const getTotalPages = (totalItems: number, pageSize: number): number =>
  totalItems <= 0 || pageSize <= 0 ? 0 : Math.ceil(totalItems / pageSize);

const range = (from: number, to: number): number[] =>
  Array.from({ length: to - from + 1 }, (_, index) => from + index);

type PaginationInput = { page: number; totalPages: number };

/**
 * Páginas a exibir: até 7 mostra todas; acima disso, primeira, última e vizinhas da atual
 * separadas por `"ellipsis-start"`/`"ellipsis-end"` (ex.: `[1, "ellipsis-start", 4, 5, 6, "ellipsis-end", 10]`), chaves estáveis para o React.
 */
export const getPaginationRange = ({ page, totalPages }: PaginationInput): PaginationItem[] => {
  if (totalPages <= MAX_VISIBLE_PAGES) return range(1, totalPages);

  const current = Math.min(Math.max(page, 1), totalPages);
  // Perto das pontas mostra um bloco contíguo maior para manter sempre 7 itens (sem "salto").
  if (current <= 4) return [...range(1, 5), "ellipsis-end", totalPages];
  if (current >= totalPages - 3) return [1, "ellipsis-start", ...range(totalPages - 4, totalPages)];
  return [1, "ellipsis-start", current - 1, current, current + 1, "ellipsis-end", totalPages];
};
