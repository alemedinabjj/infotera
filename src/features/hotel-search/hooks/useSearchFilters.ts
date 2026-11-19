"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";
import { applyFilterChange, type FilterChange } from "../model/filter-change";
import { parseSearchFilters, type SearchFilters, withFilters } from "../model/search-filters";

type UseSearchFilters = {
  filters: SearchFilters;
  /** Aplica uma mudança (volta para a página 1) e grava a URL canônica com `replaceState`. */
  update: (change: FilterChange) => void;
  /** Troca só a página, sem nova entrada no histórico (ex.: página fora do intervalo). */
  replacePage: (page: number) => void;
  /** Link da página `n` mantendo critérios e filtros (para a paginação em modo link). */
  pageHref: (page: number) => string;
};

/**
 * Filtros, ordenação e página como estado da URL. Leitura por `useSearchParams`; escrita por
 * `window.history.replaceState` (o Next 16 integra a History API ao router, sem request ao
 * servidor). A escrita parte de `window.location`, não do último render, para toques rápidos
 * em sequência nunca perderem uma mudança.
 */
export const useSearchFilters = (): UseSearchFilters => {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const filters = useMemo(() => parseSearchFilters(searchParams), [searchParams]);

  const write = useCallback((change: (current: SearchFilters) => SearchFilters) => {
    const current = new URLSearchParams(window.location.search);
    const next = withFilters(current, change(parseSearchFilters(current)));
    const query = next.toString();
    window.history.replaceState(null, "", `${window.location.pathname}${query ? `?${query}` : ""}`);
  }, []);

  const update = useCallback(
    (change: FilterChange) => write((current) => applyFilterChange(current, change)),
    [write],
  );

  const replacePage = useCallback(
    (page: number) => write((current) => ({ ...current, page })),
    [write],
  );

  const pageHref = useCallback(
    (page: number) => `${pathname}?${withFilters(searchParams, { ...filters, page }).toString()}`,
    [pathname, searchParams, filters],
  );

  return { filters, update, replacePage, pageHref };
};
