import type { Hotel } from "@/shared/api/schemas";
import { searchHref } from "@/shared/lib/links";
import type { SearchCriteria } from "@/shared/lib/search-params";

export type BreadcrumbItem = { label: string; href: string | null };

export type HotelBreadcrumb = {
  /** Início › Hotéis em {destino} › {hotel}; o último não tem link. */
  items: BreadcrumbItem[];
  /** Link do nível acima (mobile: `← Hotéis em {destino}`). */
  backHref: string;
  backLabel: string;
};

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
