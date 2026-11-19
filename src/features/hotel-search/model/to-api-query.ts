import { type Amenity, amenitySchema, propertyTypeSchema } from "@/shared/api/schemas";
import { PAGE_SIZE, PRICE_RANGE, type SearchFilters, type SortOption } from "./search-filters";

type SortParams = { _sort: string; _order: string };

/**
 * Ordenação da API com desempate explícito (json-server 0.17 aceita listas em `_sort`/`_order`):
 * páginas determinísticas mesmo com empates de nota ou preço.
 */
export const SORT_TO_API: Record<SortOption, SortParams> = {
  popular: { _sort: "reviewCount,id", _order: "desc,asc" },
  "price-asc": { _sort: "pricePerNight,id", _order: "asc,asc" },
  "rating-desc": { _sort: "rating,reviewCount", _order: "desc,desc" },
};

/** Query da API de hotéis. Também é a chave de cache (valores primitivos ou listas de string). */
export type HotelsApiQuery = {
  destination: string;
  pricePerNight_gte?: number;
  pricePerNight_lte?: number;
  rating_gte?: number;
  propertyType?: string[];
  amenities_like?: string;
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
export const amenitiesPattern = (amenities: readonly Amenity[]): string =>
  `^${amenitySchema.options
    .filter((option) => amenities.includes(option))
    .map((option) => `(?=.*\\b${option}\\b)`)
    .join("")}`;

/** Filtros da URL → query da `GET /hotels` (omite o que está no valor-padrão). */
export const toHotelsApiQuery = (destination: string, filters: SearchFilters): HotelsApiQuery => ({
  destination,
  ...(filters.minPrice > PRICE_RANGE.min ? { pricePerNight_gte: filters.minPrice } : {}),
  ...(filters.maxPrice < PRICE_RANGE.max ? { pricePerNight_lte: filters.maxPrice } : {}),
  ...(filters.minRating !== null ? { rating_gte: filters.minRating } : {}),
  ...(filters.types.length > 0
    ? { propertyType: propertyTypeSchema.options.filter((type) => filters.types.includes(type)) }
    : {}),
  ...(filters.amenities.length > 0 ? { amenities_like: amenitiesPattern(filters.amenities) } : {}),
  ...SORT_TO_API[filters.sort],
  _page: filters.page,
  _limit: PAGE_SIZE,
});
