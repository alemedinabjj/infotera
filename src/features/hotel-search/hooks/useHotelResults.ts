"use client";

import { useQuery } from "@tanstack/react-query";
import { useHydrated } from "@/shared/hooks/useHydrated";
import { useSlowLoading } from "@/shared/hooks/useSlowLoading";
import { hotelsQueryOptions } from "../api/hotels";
import { deriveResultsView, type ResultsView } from "../model/results-view";
import { hasActiveFilters, type SearchFilters } from "../model/search-filters";
import { hasFailed, type ResultsModel } from "./results-model";

/**
 * Query da lista paginada + visão derivada. Troca de filtro/página mantém a lista anterior (só do
 * mesmo destino). A correção de página fora do intervalo fica no controller. `enabled` desliga a
 * busca quando o modo ativo é a rolagem contínua (o hook continua montado).
 */
export const useHotelResults = (
  destination: string,
  filters: SearchFilters,
  enabled: boolean,
): ResultsModel => {
  const query = useQuery({ ...hotelsQueryOptions(destination, filters), enabled });
  // O cache restaurado do `localStorage` só existe no cliente: até hidratar, tudo se comporta como
  // "sem dado" (igual ao HTML do servidor); depois o dado aparece sem divergência de hidratação.
  const hydrated = useHydrated();
  const data = hydrated ? query.data : undefined;
  const hasData = data !== undefined;
  const loading: ResultsView = { kind: "loading" };
  const view = !hydrated
    ? loading
    : deriveResultsView({
        hasData,
        isError: hasFailed({
          hasData,
          isError: query.isError,
          errorUpdateCount: query.errorUpdateCount,
        }),
        isPlaceholderData: query.isPlaceholderData,
        isPaused: query.fetchStatus === "paused",
        total: data?.total ?? 0,
        page: filters.page,
        hasActiveFilters: hasActiveFilters(filters),
      });
  const slow = useSlowLoading(enabled && view.kind === "loading");

  return {
    view,
    items: data?.items ?? [],
    total: data?.total ?? 0,
    center: data?.center ?? null,
    slow,
    retry: () => void query.refetch(),
    isFetching: query.isFetching,
    feed: null,
  };
};
