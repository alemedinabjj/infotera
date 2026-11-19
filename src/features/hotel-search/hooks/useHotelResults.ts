"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import type { Hotel } from "@/shared/api/schemas";
import { hotelsQueryOptions } from "../api/hotels";
import { deriveResultsView, type ResultsView } from "../model/results-view";
import { hasActiveFilters, type SearchFilters } from "../model/search-filters";
import { useSlowLoading } from "./useSlowLoading";

type UseHotelResults = {
  view: ResultsView;
  items: Hotel[];
  total: number;
  /** Está carregando demais (> 5 s). */
  slow: boolean;
  retry: () => void;
  /** Um refetch está em andamento (alimenta "Tentando…" e o botão do sheet). */
  isFetching: boolean;
};

/**
 * Query da lista + visão derivada. Troca de filtro/página mantém a lista anterior (só do mesmo
 * destino); página fora do intervalo salta para a última.
 */
export const useHotelResults = (
  destination: string,
  filters: SearchFilters,
  replacePage: (page: number) => void,
): UseHotelResults => {
  const query = useQuery(hotelsQueryOptions(destination, filters));
  const view = deriveResultsView({
    hasData: query.data !== undefined,
    isError: query.isError,
    isPlaceholderData: query.isPlaceholderData,
    isPaused: query.fetchStatus === "paused",
    total: query.data?.total ?? 0,
    page: filters.page,
    hasActiveFilters: hasActiveFilters(filters),
  });
  const slow = useSlowLoading(view.kind === "loading");
  const lastPage = view.kind === "out-of-range" ? view.lastPage : null;

  useEffect(() => {
    if (lastPage !== null) replacePage(lastPage);
  }, [lastPage, replacePage]);

  return {
    view,
    items: query.data?.items ?? [],
    total: query.data?.total ?? 0,
    slow,
    retry: () => void query.refetch(),
    isFetching: query.isFetching,
  };
};
