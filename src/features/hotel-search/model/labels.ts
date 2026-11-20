import type { SortOption } from "./search-filters";

export const sortLabel = (sort: SortOption): string => {
  switch (sort) {
    case "popular":
      return "Mais populares";
    case "price-asc":
      return "Menor preço";
    case "rating-desc":
      return "Maior avaliação";
    default: {
      const unreachable: never = sort;
      return unreachable;
    }
  }
};
