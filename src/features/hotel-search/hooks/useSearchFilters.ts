"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { useLocale } from "@/shared/i18n/client";
import { localizePath } from "@/shared/i18n/paths";
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
  // Nunca `usePathname()` em render: com o rewrite do proxy ele pode divergir entre servidor e cliente.
  const pathname = localizePath(useLocale(), "/search");
  const urlFilters = useMemo(() => parseSearchFilters(searchParams), [searchParams]);
  // O Next atualiza `useSearchParams` numa transition (um tique depois do `replaceState`): sem
  // isso o controle marcado "desmarcaria" por um instante. O valor otimista vale enquanto a URL
  // lida ainda é a mesma de quando a mudança foi feita; qualquer mudança de URL assume a partir daí.
  const [optimistic, setOptimistic] = useState<{
    base: SearchFilters;
    value: SearchFilters;
  } | null>(null);
  const filters = optimistic?.base === urlFilters ? optimistic.value : urlFilters;

  const write = useCallback(
    (change: (current: SearchFilters) => SearchFilters) => {
      const current = new URLSearchParams(window.location.search);
      const nextFilters = change(parseSearchFilters(current));
      const query = withFilters(current, nextFilters).toString();
      setOptimistic({ base: urlFilters, value: nextFilters });
      window.history.replaceState(
        null,
        "",
        `${window.location.pathname}${query ? `?${query}` : ""}`,
      );
    },
    [urlFilters],
  );

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
