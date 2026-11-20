import type { ListMode, SortOption } from "./search-filters";

export const sortLabel = (sort: SortOption): string => {
  switch (sort) {
    case "popular":
      return "Mais populares";
    case "price-asc":
      return "Menor preço";
    case "rating-desc":
      return "Maior avaliação";
    case "distance":
      return "Distância do centro";
    default: {
      const unreachable: never = sort;
      return unreachable;
    }
  }
};

export const listModeLabel = (mode: ListMode): string => {
  switch (mode) {
    case "pages":
      return "Em páginas";
    case "infinite":
      return "Rolagem contínua";
    default: {
      const unreachable: never = mode;
      return unreachable;
    }
  }
};
