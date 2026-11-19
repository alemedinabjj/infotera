import { infiniteQueryOptions, type QueryClient, type QueryKey } from "@tanstack/react-query";
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

/** Máximo de tentativas extras de um lote quando já há itens na tela (a lista não some). */
const NEXT_BATCH_RETRIES = 1;

type RetryOption = boolean | number | ((failureCount: number, error: Error) => boolean);

const allowsRetry = (retry: RetryOption | undefined, failureCount: number, error: Error) => {
  if (typeof retry === "function") return retry(failureCount, error);
  if (typeof retry === "number") return failureCount < retry;
  return retry === true;
};

/**
 * `retry` do feed: a 1ª carga segue o padrão do client (2 tentativas); um lote seguinte, com os
 * itens anteriores já na tela, tenta só 1 vez a mais (a espera até o erro cai de ~3 s para ~1 s).
 * Decide no momento da falha: olha se a consulta já tem dados.
 */
export const nextBatchRetry =
  (client: QueryClient, queryKey: QueryKey) => (failureCount: number, error: Error) => {
    const standard = allowsRetry(client.getDefaultOptions().queries?.retry, failureCount, error);
    const hasItems = client.getQueryData(queryKey) !== undefined;
    return hasItems ? standard && failureCount < NEXT_BATCH_RETRIES : standard;
  };
