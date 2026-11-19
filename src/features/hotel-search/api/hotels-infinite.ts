import { infiniteQueryOptions } from "@tanstack/react-query";
import type { SearchFilters } from "../model/search-filters";
import { toHotelsRequest } from "../model/to-api-query";
import {
  fetchHotelsPage,
  type HotelsPage,
  hotelsFeedKey,
  keepPreviousIfSameDestination,
} from "./hotels";

/** Próximo lote: 1-based; `undefined` quando tudo já foi carregado. */
export const nextFeedPage = (pages: readonly HotelsPage[]): number | undefined => {
  const last = pages.at(-1);
  if (last === undefined) return undefined;
  const loaded = pages.reduce((sum, page) => sum + page.items.length, 0);
  return loaded < last.total ? pages.length + 1 : undefined;
};

/** Rolagem contínua: cada lote é uma página de 10 (mesmo `fetchHotelsPage` do modo páginas). */
export const hotelsInfiniteQueryOptions = (destination: string, filters: SearchFilters) =>
  infiniteQueryOptions({
    queryKey: hotelsFeedKey(destination, filters),
    initialPageParam: 1,
    queryFn: ({ pageParam, client, signal }) =>
      fetchHotelsPage(toHotelsRequest(destination, filters, pageParam), { client, signal }),
    getNextPageParam: (_last, allPages) => nextFeedPage(allPages),
    placeholderData: keepPreviousIfSameDestination(destination),
  });
