import type { Hotel } from "@/shared/api/schemas";
import { type SearchCriteria, searchCriteriaToQueryString } from "@/shared/lib/search-params";

export type BreadcrumbItem = { label: string; href: string | null };

export type HotelBreadcrumb = {
  /** Início › Hotéis em {destino} › {hotel}; o último não tem link. */
  items: BreadcrumbItem[];
  /** Link do nível acima (mobile: `← Hotéis em {destino}`). */
  backHref: string;
  backLabel: string;
};

/** Link para a lista: com os critérios da busca (`stay`) ou só com o destino (`browse`). */
export const searchHref = (destination: string, criteria: SearchCriteria | null): string =>
  criteria
    ? `/search?${searchCriteriaToQueryString(criteria)}`
    : `/search?${new URLSearchParams({ destination }).toString()}`;

export const hotelBreadcrumb = (hotel: Hotel, criteria: SearchCriteria | null): HotelBreadcrumb => {
  const backHref = searchHref(hotel.destination, criteria);
  const backLabel = `Hotéis em ${hotel.destination}`;
  return {
    items: [
      { label: "Início", href: "/" },
      { label: backLabel, href: backHref },
      { label: hotel.name, href: null },
    ],
    backHref,
    backLabel,
  };
};
