"use client";

import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { useHydrated } from "@/shared/hooks/useHydrated";
import { useSlowLoading } from "@/shared/hooks/useSlowLoading";
import { hotelsInfiniteQueryOptions, nextBatchRetry } from "../api/hotels-infinite";
import { deriveFeedFooter } from "../model/feed";
import { deriveResultsView, type ResultsView } from "../model/results-view";
import { hasActiveFilters, type SearchFilters } from "../model/search-filters";
import { hasFailed, type ResultsModel } from "./results-model";

/**
 * Rolagem contínua: `useInfiniteQuery` com lotes de 10 + a mesma visão derivada da lista paginada.
 * `enabled` desliga a busca quando o modo ativo é "Em páginas" (o hook continua montado, para a
 * toolbar nunca desmontar).
 */
export const useHotelFeed = (
  destination: string,
  filters: SearchFilters,
  enabled: boolean,
): ResultsModel => {
  const client = useQueryClient();
  const options = hotelsInfiniteQueryOptions(destination, filters);
  const query = useInfiniteQuery({
    ...options,
    enabled,
    retry: nextBatchRetry(client, options.queryKey),
  });
  // Cache restaurado só existe no cliente: até hidratar vale "sem dado" (igual ao HTML do servidor).
  const hydrated = useHydrated();
  const pages = hydrated ? query.data?.pages : undefined;
  const items = useMemo(() => pages?.flatMap((page) => page.items) ?? [], [pages]);
  const total = pages?.at(-1)?.total ?? 0;
  const hasData = pages !== undefined;

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
        total,
        page: 1,
        hasActiveFilters: hasActiveFilters(filters),
      });
  const slow = useSlowLoading(enabled && view.kind === "loading");

  return {
    view,
    items,
    total,
    center: pages?.[0]?.center ?? null,
    slow,
    retry: () => void query.refetch(),
    isFetching: query.isFetching,
    feed: {
      footer: deriveFeedFooter({
        hasNextPage: query.hasNextPage,
        isFetchingNextPage: query.isFetchingNextPage,
        isFetchNextPageError: query.isFetchNextPageError,
        total,
      }),
      loaded: items.length,
      queryKey: JSON.stringify(options.queryKey),
      batches: pages?.length ?? 0,
      isFetchingNextPage: query.isFetchingNextPage,
      loadMore: () => void query.fetchNextPage(),
    },
  };
};
