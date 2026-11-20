import type { InfiniteData, QueryClient } from "@tanstack/react-query";
import type { ListMode, SearchFilters } from "../model/search-filters";
import { type HotelsPage, hotelsFeedKey, hotelsPageKey } from "./hotels";

/**
 * Ao trocar de modo, leva o que já está em cache para o outro modo: a página 1 vira o lote 1 do
 * feed e o 1º lote vira a página 1. Sem skeleton e sem request (a idade do dado original é
 * preservada: o `staleTime` vale igual). Nunca sobrescreve dado que o destino já tem. Feito na
 * troca (e não por `initialData`) porque os dois hooks ficam montados e a query inativa já existe.
 */
export const seedViewSwitch = (
  client: QueryClient,
  destination: string,
  filters: SearchFilters,
  to: ListMode,
): void => {
  const pageKey = hotelsPageKey(destination, filters, 1);
  const feedKey = hotelsFeedKey(destination, filters);
  if (to === "infinite") {
    const page = client.getQueryData<HotelsPage>(pageKey);
    if (page === undefined || client.getQueryData(feedKey) !== undefined) return;
    const data: InfiniteData<HotelsPage, number> = { pages: [page], pageParams: [1] };
    client.setQueryData(feedKey, data, { updatedAt: client.getQueryState(pageKey)?.dataUpdatedAt });
    return;
  }
  const first = client.getQueryData<InfiniteData<HotelsPage, number>>(feedKey)?.pages[0];
  if (first === undefined || client.getQueryData(pageKey) !== undefined) return;
  client.setQueryData(pageKey, first, { updatedAt: client.getQueryState(feedKey)?.dataUpdatedAt });
};
