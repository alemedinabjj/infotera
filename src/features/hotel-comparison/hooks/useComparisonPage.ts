"use client";

import { keepPreviousData, type UseQueryResult, useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { orderByIds } from "@/shared/api/ids";
import { hotelsByIdsQueryOptions, roomsByHotelsQueryOptions } from "@/shared/api/queries";
import type { Hotel, Room } from "@/shared/api/schemas";
import { useSlowLoading } from "@/shared/hooks/useSlowLoading";
import { parseSearchCriteria, type SearchCriteria } from "@/shared/lib/search-params";
import { parseCompareParams } from "../model/compare-params";
import { buildHotelComparison, type HotelComparison } from "../model/hotel-comparison";
import { usePruneNotFound } from "./usePruneNotFound";

export type ComparisonState =
  | { kind: "empty" }
  | { kind: "loading"; slow: boolean }
  | { kind: "offline" }
  | { kind: "error"; retrying: boolean; retry: () => void }
  | { kind: "success"; hotels: Hotel[]; comparison: HotelComparison; notFound: number };

type Result = {
  ids: number[];
  /** Busca de origem na URL (`?destination=…&checkIn=…`): os links dos hotéis a levam junto. */
  criteria: SearchCriteria | null;
  state: ComparisonState;
};

const retryFailed = (queries: readonly UseQueryResult<unknown>[]) => {
  for (const query of queries) if (query.isError) void query.refetch();
};

const derive = (
  ids: readonly number[],
  hotelsQuery: UseQueryResult<Hotel[]>,
  roomsQuery: UseQueryResult<Room[]>,
  slow: boolean,
  notFound: number,
): ComparisonState => {
  if (ids.length === 0) return { kind: "empty" };
  const queries = [hotelsQuery, roomsQuery];
  if (queries.some((query) => query.isError)) {
    return {
      kind: "error",
      retrying: queries.some((query) => query.isFetching),
      retry: () => retryFailed(queries),
    };
  }
  if (hotelsQuery.isSuccess && roomsQuery.isSuccess) {
    const hotels = orderByIds(hotelsQuery.data, ids);
    return {
      kind: "success",
      hotels,
      comparison: buildHotelComparison(hotels, roomsQuery.data),
      notFound,
    };
  }
  const paused = queries.some((query) => query.fetchStatus === "paused");
  return paused ? { kind: "offline" } : { kind: "loading", slow };
};

/**
 * Ids da URL (`?hotel=`) + hotéis e quartos em paralelo. Só sai de `loading` quando os **dois**
 * chegaram; `keepPreviousData` mantém a tabela ao remover um hotel (sem voltar ao skeleton); um único estado de erro, cujo retry refaz só o que falhou.
 */
export const useComparisonPage = (): Result => {
  const params = useSearchParams();
  const ids = useMemo(() => parseCompareParams(new URLSearchParams(params.toString())), [params]);
  const criteria = useMemo(() => {
    const parsed = parseSearchCriteria(new URLSearchParams(params.toString()));
    return parsed.success ? parsed.data : null;
  }, [params]);
  const hotelsQuery = useQuery({
    ...hotelsByIdsQueryOptions(ids),
    placeholderData: keepPreviousData,
  });
  const roomsQuery = useQuery({
    ...roomsByHotelsQueryOptions(ids),
    placeholderData: keepPreviousData,
  });
  const loading = ids.length > 0 && !(hotelsQuery.isSuccess && roomsQuery.isSuccess);
  const slow = useSlowLoading(loading);
  const notFound = usePruneNotFound(
    ids,
    hotelsQuery.data,
    hotelsQuery.isSuccess && !hotelsQuery.isPlaceholderData,
    criteria,
  );
  return { ids, criteria, state: derive(ids, hotelsQuery, roomsQuery, slow, notFound) };
};
