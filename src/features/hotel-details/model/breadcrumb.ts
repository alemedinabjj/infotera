import type { Hotel } from "@/shared/api/schemas";
import { DEFAULT_LOCALE, type Locale } from "@/shared/i18n/config";
import { localizePath } from "@/shared/i18n/paths";
import { searchHref } from "@/shared/lib/links";
import type { SearchCriteria } from "@/shared/lib/search-params";
import { hotelDetailsMessages } from "../i18n/messages";

export type BreadcrumbItem = { label: string; href: string | null };

export type HotelBreadcrumb = {
  /** Nome acessível do `nav` ("Você está aqui"). */
  navLabel: string;
  /** Início › Hotéis em {destino} › {hotel}; o último não tem link. */
  items: BreadcrumbItem[];
  /** Link do nível acima (mobile: `← Hotéis em {destino}`). */
  backHref: string;
  backLabel: string;
};

export const hotelBreadcrumb = (
  hotel: Hotel,
  criteria: SearchCriteria | null,
  locale: Locale = DEFAULT_LOCALE,
): HotelBreadcrumb => {
  const t = hotelDetailsMessages.get(locale).breadcrumb;
  const backHref = localizePath(locale, searchHref(hotel.destination, criteria));
  const backLabel = t.hotelsIn({ destination: hotel.destination });
  return {
    navLabel: t.label,
    items: [
      { label: t.home, href: localizePath(locale, "/") },
      { label: backLabel, href: backHref },
      { label: hotel.name, href: null },
    ],
    backHref,
    backLabel,
  };
};
