import { queryOptions } from "@tanstack/react-query";
import { apiGetPage } from "@/shared/api/http";
import { queryKeys } from "@/shared/api/query-keys";
import { type Hotel, hotelSchema } from "@/shared/api/schemas";
import type { SearchFilters } from "../model/search-filters";
import { type HotelsApiQuery, toHotelsApiQuery } from "../model/to-api-query";

export type HotelsPage = { items: Hotel[]; total: number };

/** `GET /hotels` com paginação da API (`X-Total-Count`). */
export const fetchHotels = (query: HotelsApiQuery, signal?: AbortSignal): Promise<HotelsPage> =>
  apiGetPage("/hotels", hotelSchema, { query, signal });

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

/**
 * `placeholderData` da lista: mantém a lista anterior só se a query anterior era do MESMO destino
 * (troca de filtro/página sem piscar). Nova busca (outro destino) mostra skeleton, nunca os
 * hotéis da cidade antiga.
 */
export const keepPreviousIfSameDestination =
  (destination: string) =>
  (
    previousData: HotelsPage | undefined,
    previousQuery: { queryKey: readonly unknown[] } | undefined,
  ): HotelsPage | undefined => {
    const previousParams = previousQuery?.queryKey[2];
    return isRecord(previousParams) && previousParams.destination === destination
      ? previousData
      : undefined;
  };

/** Query da lista. A chave é a própria query da API (filtros equivalentes = mesma chave). */
export const hotelsQueryOptions = (destination: string, filters: SearchFilters) => {
  const apiQuery = toHotelsApiQuery(destination, filters);
  return queryOptions<HotelsPage>({
    queryKey: queryKeys.hotels.list(apiQuery),
    queryFn: ({ signal }) => fetchHotels(apiQuery, signal),
    placeholderData: keepPreviousIfSameDestination(destination),
  });
};
