import {
  type Amenity,
  amenitySchema,
  type PropertyType,
  propertyTypeSchema,
} from "@/shared/api/schemas";

/** Domínio fixo do slider de preço (R$ por noite). O topo significa "sem máximo". */
export const PRICE_RANGE = { min: 0, max: 3000, step: 50 } as const;

/** Hotéis por página (`_limit`). */
export const PAGE_SIZE = 10;

export const SORT_OPTIONS = ["popular", "price-asc", "rating-desc", "distance"] as const;
export type SortOption = (typeof SORT_OPTIONS)[number];

/** Modo de listagem: páginas (padrão) ou rolagem contínua. Preferência de exibição, não filtro. */
export const LIST_MODES = ["pages", "infinite"] as const;
export type ListMode = (typeof LIST_MODES)[number];

export const MIN_RATINGS = [3.5, 4, 4.5] as const;
export type MinRating = (typeof MIN_RATINGS)[number];

export type SearchFilters = {
  /** `0` = sem mínimo. */
  minPrice: number;
  /** `PRICE_RANGE.max` = sem máximo. */
  maxPrice: number;
  minRating: MinRating | null;
  /** Ordem de `propertyTypeSchema.options`, sem duplicatas. */
  types: PropertyType[];
  /** Ordem de `amenitySchema.options`, sem duplicatas. */
  amenities: Amenity[];
  sort: SortOption;
  /** `pages` é o padrão (omitido na URL). */
  view: ListMode;
  /** Painel do mapa aberto (`map=1`). Preferência de exibição, como `view`: não é filtro. */
  map: boolean;
  /** ≥ 1. Sempre 1 em `view=infinite`. */
  page: number;
};

export const DEFAULT_FILTERS: SearchFilters = {
  minPrice: PRICE_RANGE.min,
  maxPrice: PRICE_RANGE.max,
  minRating: null,
  types: [],
  amenities: [],
  sort: "popular",
  view: "pages",
  map: false,
  page: 1,
};

/** Chaves da URL que pertencem aos filtros (as demais são critérios da busca). */
export const FILTER_PARAM_KEYS = [
  "minPrice",
  "maxPrice",
  "minRating",
  "type",
  "amenity",
  "sort",
  "view",
  "map",
  "page",
] as const;

type ParamsInput = Pick<URLSearchParams, "get" | "getAll">;

const INTEGER = /^\d+$/;

const parseInteger = (raw: string | null): number | null => {
  if (raw === null || !INTEGER.test(raw)) return null;
  const value = Number(raw);
  return Number.isSafeInteger(value) ? value : null;
};

const clampPrice = (value: number): number =>
  Math.min(Math.max(value, PRICE_RANGE.min), PRICE_RANGE.max);

/** Preços inteiros dentro do domínio; valor inválido vira o padrão e mínimo > máximo troca. */
const parsePriceRange = (params: ParamsInput): Pick<SearchFilters, "minPrice" | "maxPrice"> => {
  const min = parseInteger(params.get("minPrice"));
  const max = parseInteger(params.get("maxPrice"));
  const minPrice = min === null ? PRICE_RANGE.min : clampPrice(min);
  const maxPrice = max === null ? PRICE_RANGE.max : clampPrice(max);
  return minPrice > maxPrice ? { minPrice: maxPrice, maxPrice: minPrice } : { minPrice, maxPrice };
};

const parseMinRating = (raw: string | null): MinRating | null => {
  if (raw === null || raw.trim() === "") return null;
  const value = Number(raw);
  return MIN_RATINGS.find((option) => option === value) ?? null;
};

const parseSort = (raw: string | null): SortOption =>
  SORT_OPTIONS.find((option) => option === raw) ?? DEFAULT_FILTERS.sort;

const parseView = (raw: string | null): ListMode =>
  LIST_MODES.find((option) => option === raw) ?? DEFAULT_FILTERS.view;

/** Só `map=1` abre o painel; qualquer outro valor (ou ausência) é fechado. */
const parseMap = (raw: string | null): boolean => raw === "1";

const parsePage = (raw: string | null): number => {
  const page = parseInteger(raw);
  return page !== null && page >= 1 ? page : DEFAULT_FILTERS.page;
};

/** Valores válidos do enum, deduplicados e na ordem do enum (URL canônica). */
const parseEnumList = <T extends string>(options: readonly T[], raw: string[]): T[] =>
  options.filter((option) => raw.includes(option));

/**
 * Lê os filtros dos search params. Tolerante por chave: um valor inválido é descartado sozinho e
 * nunca derruba a página.
 */
export const parseSearchFilters = (params: ParamsInput): SearchFilters => {
  const view = parseView(params.get("view"));
  return {
    ...parsePriceRange(params),
    minRating: parseMinRating(params.get("minRating")),
    types: parseEnumList(propertyTypeSchema.options, params.getAll("type")),
    amenities: parseEnumList(amenitySchema.options, params.getAll("amenity")),
    sort: parseSort(params.get("sort")),
    view,
    map: parseMap(params.get("map")),
    // Na rolagem contínua não existe página: a URL canônica a ignora.
    page: view === "infinite" ? DEFAULT_FILTERS.page : parsePage(params.get("page")),
  };
};

/**
 * Serializa só os filtros, em ordem fixa e sem valores-padrão (URL canônica = chave de cache
 * estável).
 */
export const serializeSearchFilters = (filters: SearchFilters): URLSearchParams => {
  const params = new URLSearchParams();
  if (filters.minPrice > PRICE_RANGE.min) params.set("minPrice", String(filters.minPrice));
  if (filters.maxPrice < PRICE_RANGE.max) params.set("maxPrice", String(filters.maxPrice));
  if (filters.minRating !== null) params.set("minRating", String(filters.minRating));
  for (const type of parseEnumList(propertyTypeSchema.options, filters.types)) {
    params.append("type", type);
  }
  for (const amenity of parseEnumList(amenitySchema.options, filters.amenities)) {
    params.append("amenity", amenity);
  }
  if (filters.sort !== DEFAULT_FILTERS.sort) params.set("sort", filters.sort);
  if (filters.view !== DEFAULT_FILTERS.view) params.set("view", filters.view);
  if (filters.map) params.set("map", "1");
  if (filters.view === "pages" && filters.page > DEFAULT_FILTERS.page) {
    params.set("page", String(filters.page));
  }
  return params;
};

const isFilterKey = (key: string): boolean => FILTER_PARAM_KEYS.some((known) => known === key);

/**
 * Troca só as chaves de filtro: tudo que não é filtro (critérios da busca e qualquer outra chave)
 * é preservado como está, na ordem original, e os filtros canônicos vêm depois.
 */
export const withFilters = (params: URLSearchParams, filters: SearchFilters): URLSearchParams => {
  const next = new URLSearchParams();
  for (const [key, value] of params) {
    if (!isFilterKey(key)) next.append(key, value);
  }
  for (const [key, value] of serializeSearchFilters(filters)) next.append(key, value);
  return next;
};

/**
 * Quantos filtros estão ativos (o contador de "Filtros (3)"): faixa de preço conta 1, nota 1 e
 * cada tipo/comodidade marcado 1. Ordenação, modo de exibição, mapa e página não são filtros.
 */
export const countActiveFilters = (filters: SearchFilters): number => {
  const price = filters.minPrice > PRICE_RANGE.min || filters.maxPrice < PRICE_RANGE.max ? 1 : 0;
  const rating = filters.minRating === null ? 0 : 1;
  return price + rating + filters.types.length + filters.amenities.length;
};

export const hasActiveFilters = (filters: SearchFilters): boolean =>
  countActiveFilters(filters) > 0;
