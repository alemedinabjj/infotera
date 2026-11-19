import { type InfiniteData, infiniteQueryOptions, type QueryClient } from "@tanstack/react-query";
import type { SearchFilters } from "../model/search-filters";
import { toHotelsRequest } from "../model/to-api-query";
import {
  fetchHotelsPage,
  type HotelsPage,
  hotelsFeedKey,
  hotelsPageKey,
  keepPreviousIfSameDestination,
} from "./hotels";

/** Próximo lote: 1-based; `undefined` quando tudo já foi carregado. */
export const nextFeedPage = (pages: readonly HotelsPage[]): number | undefined => {
  const last = pages.at(-1);
  if (last === undefined) return undefined;
  const loaded = pages.reduce((sum, page) => sum + page.items.length, 0);
  return loaded < last.total ? pages.length + 1 : undefined;
};

/**
 * Lote 1 vindo da página 1 do modo "Em páginas" em cache: trocar para "Rolagem contínua" não
 * mostra skeleton nem faz request.
 */
const seedFromPage = (client: QueryClient, destination: string, filters: SearchFilters) => {
  const key = hotelsPageKey(destination, filters, 1);
  const page = client.getQueryData<HotelsPage>(key);
  if (page === undefined) return undefined;
  const data: InfiniteData<HotelsPage, number> = { pages: [page], pageParams: [1] };
  return { data, updatedAt: client.getQueryState(key)?.dataUpdatedAt };
};

/** Rolagem contínua: cada lote é uma página de 10 (mesmo `fetchHotelsPage` do modo páginas). */
export const hotelsInfiniteQueryOptions = (
  destination: string,
  filters: SearchFilters,
  client: QueryClient,
) =>
  infiniteQueryOptions({
    queryKey: hotelsFeedKey(destination, filters),
    initialPageParam: 1,
    queryFn: ({ pageParam, client: queryClient, signal }) =>
      fetchHotelsPage(toHotelsRequest(destination, filters, pageParam), {
        client: queryClient,
        signal,
      }),
    getNextPageParam: (_last, allPages) => nextFeedPage(allPages),
    placeholderData: keepPreviousIfSameDestination(destination),
    initialData: () => seedFromPage(client, destination, filters)?.data,
    initialDataUpdatedAt: () => seedFromPage(client, destination, filters)?.updatedAt,
  });
