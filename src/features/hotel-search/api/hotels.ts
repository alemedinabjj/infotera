import { type QueryClient, queryOptions } from "@tanstack/react-query";
import { z } from "zod";
import { fetchRoomsOfHotels } from "@/shared/api/endpoints";
import { apiGet, apiGetPage } from "@/shared/api/http";
import { hotelRoomsQueryOptions } from "@/shared/api/queries";
import { queryKeys } from "@/shared/api/query-keys";
import { type Hotel, hotelSchema } from "@/shared/api/schemas";
import { computeCentroid, type GeoPoint, slicePage, sortByDistance } from "../model/distance";
import type { SearchFilters } from "../model/search-filters";
import {
  type HotelsApiQuery,
  type HotelsFilterQuery,
  type HotelsRequest,
  hotelsRequestKey,
  toHotelsFilterQuery,
  toHotelsRequest,
} from "../model/to-api-query";

/** Uma página da lista. `center` é o centroide do destino (`null` sem ele: card sem distância). */
export type HotelsPage = { items: Hotel[]; total: number; center: GeoPoint | null };

/** O centroide muda só se o cadastro de hotéis mudar: 5 min de cache bastam. */
const CENTER_STALE_TIME = 5 * 60_000;

/** `GET /hotels` com paginação da API (`X-Total-Count`). */
export const fetchHotels = (
  query: HotelsApiQuery,
  signal?: AbortSignal,
): Promise<{ items: Hotel[]; total: number }> =>
  apiGetPage("/hotels", hotelSchema, { query, signal });

/** `GET /hotels` sem paginação: todos os hotéis que passam pelos filtros de servidor. */
export const destinationHotelsQueryOptions = (filterQuery: HotelsFilterQuery) =>
  queryOptions<Hotel[]>({
    queryKey: queryKeys.hotels.list(filterQuery),
    queryFn: ({ signal }) =>
      apiGet("/hotels", z.array(hotelSchema), { query: filterQuery, signal }),
    staleTime: CENTER_STALE_TIME,
  });

/**
 * Os `fetchQuery` internos nunca fazem retry: o retry é só da query externa (senão ele se
 * multiplica: 3 x 3 requests e ~15 s até o erro).
 */
const fetchDestinationHotels = (client: QueryClient, filterQuery: HotelsFilterQuery) =>
  client.fetchQuery({ ...destinationHotelsQueryOptions(filterQuery), retry: false });

/** Centroide do destino INTEIRO (sem filtros): a distância de um hotel não muda ao filtrar. */
const fetchCenter = async (destination: string, client: QueryClient): Promise<GeoPoint | null> =>
  computeCentroid(await fetchDestinationHotels(client, { destination }));

/**
 * Quartos dos hotéis da página/lote num ÚNICO request (`/rooms?hotelId=..&hotelId=..`), semeados no
 * cache de `hotelRoomsQueryOptions(id)`: o card calcula o "a partir de" com eles e o detalhe do
 * hotel abre sem pedir os quartos de novo. Acessório: se falhar, o card usa o preço do hotel.
 */
const seedRooms = async (client: QueryClient, hotels: readonly Hotel[]): Promise<void> => {
  if (hotels.length === 0) return;
  try {
    const rooms = await fetchRoomsOfHotels(hotels.map((hotel) => hotel.id));
    for (const { id } of hotels) {
      client.setQueryData(
        hotelRoomsQueryOptions(id).queryKey,
        rooms.filter((room) => room.hotelId === id),
      );
    }
  } catch {
    // Sem quartos o card mostra o `pricePerNight` do hotel.
  }
};

type PageContext = { client: QueryClient; signal?: AbortSignal };

const fetchDistancePage = async (
  request: Extract<HotelsRequest, { kind: "distance" }>,
  { client }: PageContext,
): Promise<HotelsPage> => {
  const { filterQuery, page, limit } = request;
  // Sem filtros as duas buscas têm a mesma chave: um request só. Aqui o centro é obrigatório.
  const [hotels, center] = await Promise.all([
    fetchDestinationHotels(client, filterQuery),
    fetchCenter(filterQuery.destination, client),
  ]);
  const sorted = sortByDistance(hotels, center);
  const items = slicePage(sorted, page, limit);
  await seedRooms(client, items);
  return { items, total: sorted.length, center };
};

/**
 * Busca uma página. Ordenações de API: lista e centroide em paralelo, e a falha do centroide só
 * omite a distância. `distance`: lista inteira filtrada + centroide, ordenada e fatiada no cliente.
 * O `fetchQuery` interno não herda o `signal` (≤ 14 itens, com cache).
 */
export const fetchHotelsPage = async (
  request: HotelsRequest,
  context: PageContext,
): Promise<HotelsPage> => {
  switch (request.kind) {
    case "server": {
      const { destination } = request.query;
      const [page, center] = await Promise.all([
        fetchHotels(request.query, context.signal),
        fetchCenter(destination, context.client).catch(() => null),
      ]);
      await seedRooms(context.client, page.items);
      return { ...page, center };
    }
    case "distance":
      return fetchDistancePage(request, context);
    default: {
      const unreachable: never = request;
      return unreachable;
    }
  }
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

/**
 * `placeholderData` da lista: mantém a lista anterior só se a query anterior era do MESMO destino
 * (troca de filtro/página sem piscar). Nova busca (outro destino) mostra skeleton, nunca os
 * hotéis da cidade antiga. Serve às duas queries (páginas e rolagem contínua).
 */
export const keepPreviousIfSameDestination =
  (destination: string) =>
  <T>(
    previousData: T | undefined,
    previousQuery: { queryKey: readonly unknown[] } | undefined,
  ): T | undefined => {
    const previousParams = previousQuery?.queryKey[2];
    return isRecord(previousParams) && previousParams.destination === destination
      ? previousData
      : undefined;
  };

/** Chave da rolagem contínua: filtros + ordenação (sem página: o feed acumula os lotes). */
export const hotelsFeedKey = (destination: string, filters: SearchFilters) =>
  queryKeys.hotels.infinite({ ...toHotelsFilterQuery(destination, filters), sort: filters.sort });

/** Chave da página N da lista (`pages`). */
export const hotelsPageKey = (destination: string, filters: SearchFilters, page: number) =>
  queryKeys.hotels.list(hotelsRequestKey(toHotelsRequest(destination, filters, page)));

/** Query da página. A chave identifica o pedido (filtros equivalentes = mesma chave). */
export const hotelsQueryOptions = (destination: string, filters: SearchFilters) => {
  const request = toHotelsRequest(destination, filters);
  return queryOptions<HotelsPage>({
    queryKey: queryKeys.hotels.list(hotelsRequestKey(request)),
    queryFn: ({ client, signal }) => fetchHotelsPage(request, { client, signal }),
    placeholderData: keepPreviousIfSameDestination(destination),
  });
};
