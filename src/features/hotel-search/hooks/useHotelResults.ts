"use client";

import { useQuery } from "@tanstack/react-query";
import { hotelsQueryOptions } from "../api/hotels";
import { deriveResultsView } from "../model/results-view";
import { hasActiveFilters, type SearchFilters } from "../model/search-filters";
import { hasFailed, type ResultsModel } from "./results-model";
import { useSlowLoading } from "./useSlowLoading";

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
  const hasData = query.data !== undefined;
  const view = deriveResultsView({
    hasData,
    isError: hasFailed({
      hasData,
      isError: query.isError,
      errorUpdateCount: query.errorUpdateCount,
    }),
    isPlaceholderData: query.isPlaceholderData,
    isPaused: query.fetchStatus === "paused",
    total: query.data?.total ?? 0,
    page: filters.page,
    hasActiveFilters: hasActiveFilters(filters),
  });
  const slow = useSlowLoading(enabled && view.kind === "loading");

  return {
    view,
    items: query.data?.items ?? [],
    total: query.data?.total ?? 0,
    center: query.data?.center ?? null,
    slow,
    retry: () => void query.refetch(),
    isFetching: query.isFetching,
    feed: null,
  };
};
