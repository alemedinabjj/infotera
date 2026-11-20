import type { Amenity, PropertyType } from "@/shared/api/schemas";
import {
  DEFAULT_FILTERS,
  type ListMode,
  type MinRating,
  type SearchFilters,
  type SortOption,
} from "./search-filters";

export type FilterChange =
  | { type: "setPrice"; min: number; max: number }
  | { type: "setRating"; value: MinRating | null }
  | { type: "toggleType"; value: PropertyType }
  | { type: "toggleAmenity"; value: Amenity }
  | { type: "setSort"; value: SortOption }
  | { type: "setView"; value: ListMode }
  | { type: "toggleMap" }
  | { type: "clear" };

const toggle = <T>(list: readonly T[], value: T): T[] =>
  list.includes(value) ? list.filter((item) => item !== value) : [...list, value];

const applyChange = (filters: SearchFilters, change: FilterChange): SearchFilters => {
  switch (change.type) {
    case "setPrice":
      return { ...filters, minPrice: change.min, maxPrice: change.max };
    case "setRating":
      return { ...filters, minRating: change.value };
    case "toggleType":
      return { ...filters, types: toggle(filters.types, change.value) };
    case "toggleAmenity":
      return { ...filters, amenities: toggle(filters.amenities, change.value) };
    case "setSort":
      return { ...filters, sort: change.value };
    case "setView":
      return { ...filters, view: change.value };
    case "toggleMap":
      return { ...filters, map: !filters.map };
    case "clear":
      // Ordenar, escolher o modo de exibição e abrir o mapa não são filtrar: sobrevivem.
      return { ...DEFAULT_FILTERS, sort: filters.sort, view: filters.view, map: filters.map };
    default: {
      const unreachable: never = change;
      return unreachable;
    }
  }
};

/**
 * Reducer puro das mudanças de filtro. Toda ação volta para a página 1, exceto abrir/fechar o mapa
 * (só muda como a página atual é exibida). A lista resultante é normalizada (ordem do enum, sem
 * duplicatas) por `serializeSearchFilters` ao gravar na URL.
 */
export const applyFilterChange = (filters: SearchFilters, change: FilterChange): SearchFilters =>
  change.type === "toggleMap"
    ? applyChange(filters, change)
    : { ...applyChange(filters, change), page: 1 };
