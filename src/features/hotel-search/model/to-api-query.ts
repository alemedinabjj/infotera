import { type Amenity, amenitySchema, propertyTypeSchema } from "@/shared/api/schemas";
import { PAGE_SIZE, PRICE_RANGE, type SearchFilters, type SortOption } from "./search-filters";

/** Ordenações que a API resolve; `distance` é feita no cliente. */
export type ServerSort = Exclude<SortOption, "distance">;

type SortParams = { _sort: string; _order: string };

/**
 * Ordenação da API com desempate explícito (json-server 0.17 aceita listas em `_sort`/`_order`):
 * páginas determinísticas mesmo com empates de nota ou preço.
 */
export const SORT_TO_API: Record<ServerSort, SortParams> = {
  popular: { _sort: "reviewCount,id", _order: "desc,asc" },
  "price-asc": { _sort: "pricePerNight,id", _order: "asc,asc" },
  "rating-desc": { _sort: "rating,reviewCount", _order: "desc,desc" },
};

/** Só os filtros (servidor). Também é parte da chave de cache (valores primitivos ou listas). */
export type HotelsFilterQuery = {
  destination: string;
  pricePerNight_gte?: number;
  pricePerNight_lte?: number;
  rating_gte?: number;
  propertyType?: string[];
  amenities_like?: string;
};

/** Filtros + ordenação e paginação da API. */
export type HotelsApiQuery = HotelsFilterQuery & {
  _sort: string;
  _order: string;
  _page: number;
  _limit: number;
};

/**
 * Regex única com lookaheads: exige TODAS as comodidades (E). O `_like` do json-server é
 * `new RegExp(valor, "i").test(String(array))` e um array vira `"wifi,pool,spa"`; `\b` evita casar
 * substring. Montada só com valores do enum `amenitySchema` (nunca texto do usuário: sem injeção
 * nem ReDoS), na ordem do enum para a chave de cache ser estável.
 */
export const amenitiesPattern = (amenities: readonly Amenity[]): string => {
  const wanted = new Set(amenities);
  const lookaheads = amenitySchema.options
    .filter((option) => wanted.has(option))
    .map((option) => `(?=.*\\b${option}\\b)`);
  return `^${lookaheads.join("")}`;
};

/** Filtros da URL → parâmetros de filtro da `GET /hotels` (omite o que está no valor-padrão). */
export const toHotelsFilterQuery = (
  destination: string,
  filters: SearchFilters,
): HotelsFilterQuery => {
  const selectedTypes = new Set(filters.types);
  return {
    destination,
    ...(filters.minPrice > PRICE_RANGE.min ? { pricePerNight_gte: filters.minPrice } : {}),
    ...(filters.maxPrice < PRICE_RANGE.max ? { pricePerNight_lte: filters.maxPrice } : {}),
    ...(filters.minRating !== null ? { rating_gte: filters.minRating } : {}),
    ...(filters.types.length > 0
      ? { propertyType: propertyTypeSchema.options.filter((type) => selectedTypes.has(type)) }
      : {}),
    ...(filters.amenities.length > 0
      ? { amenities_like: amenitiesPattern(filters.amenities) }
      : {}),
  };
};

/** Query da API com ordenação de servidor e paginação. */
export const toHotelsApiQuery = (
  destination: string,
  filters: SearchFilters,
  sort: ServerSort,
  page: number = filters.page,
): HotelsApiQuery => ({
  ...toHotelsFilterQuery(destination, filters),
  ...SORT_TO_API[sort],
  _page: page,
  _limit: PAGE_SIZE,
});

/** Como buscar uma página: pela API (`server`) ou lista inteira + ordenação no cliente (`distance`). */
export type HotelsRequest =
  | { kind: "server"; query: HotelsApiQuery }
  | { kind: "distance"; filterQuery: HotelsFilterQuery; page: number; limit: number };

/** Resolve o pedido da página `page` (padrão: a da URL) conforme a ordenação. */
export const toHotelsRequest = (
  destination: string,
  filters: SearchFilters,
  page: number = filters.page,
): HotelsRequest => {
  switch (filters.sort) {
    case "popular":
    case "price-asc":
    case "rating-desc":
      return { kind: "server", query: toHotelsApiQuery(destination, filters, filters.sort, page) };
    case "distance":
      return {
        kind: "distance",
        filterQuery: toHotelsFilterQuery(destination, filters),
        page,
        limit: PAGE_SIZE,
      };
    default: {
      const unreachable: never = filters.sort;
      return unreachable;
    }
  }
};

/** Chave de cache da página: nunca colide entre `server`, `distance` e a lista inteira. */
export const hotelsRequestKey = (
  request: HotelsRequest,
): Readonly<Record<string, string | number | readonly string[] | undefined>> => {
  switch (request.kind) {
    case "server":
      return request.query;
    case "distance":
      return {
        ...request.filterQuery,
        sort: "distance",
        page: request.page,
        limit: request.limit,
      };
    default: {
      const unreachable: never = request;
      return unreachable;
    }
  }
};
