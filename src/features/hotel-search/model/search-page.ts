import { formatDateRange, type ISODate, nightsBetween } from "@/shared/lib/dates";
import { formatGuests, pluralize } from "@/shared/lib/format";
import {
  parseDestinationParam,
  parseSearchCriteria,
  type SearchCriteria,
  searchCriteriaToQueryString,
} from "@/shared/lib/search-params";

/** Os três modos da página `/search`, derivados só dos critérios da URL (nunca dos filtros). */
export type SearchPage =
  | { kind: "missing-destination" }
  | { kind: "browse"; destination: string }
  | { kind: "stay"; criteria: SearchCriteria };

type SearchPageInput = URLSearchParams | Record<string, string | string[] | undefined>;

const readDestination = (input: SearchPageInput): string | null =>
  parseDestinationParam(
    input instanceof URLSearchParams ? (input.get("destination") ?? undefined) : input.destination,
  );

/**
 * `missing-destination`: sem destino válido. `browse`: destino válido, mas datas/hóspedes ausentes
 * ou inválidos (lista sem total). `stay`: critérios completos e válidos.
 */
export const parseSearchPage = (input: SearchPageInput): SearchPage => {
  const destination = readDestination(input);
  if (destination === null) return { kind: "missing-destination" };
  const criteria = parseSearchCriteria(input);
  return criteria.success
    ? { kind: "stay", criteria: criteria.data }
    : { kind: "browse", destination };
};

/** Link do card para o detalhe: com os critérios no modo `stay`, sem nada no `browse`. */
export const hotelHref = (hotelId: number, criteria: SearchCriteria | null): string =>
  criteria ? `/hotel/${hotelId}?${searchCriteriaToQueryString(criteria)}` : `/hotel/${hotelId}`;

const SITE = "Infotera Hotéis";

/** `<title>` da página: `Hotéis em Rio de Janeiro, RJ | Infotera Hotéis`. */
export const searchPageTitle = (page: SearchPage): string => {
  switch (page.kind) {
    case "missing-destination":
      return `Buscar hotéis | ${SITE}`;
    case "browse":
      return `Hotéis em ${page.destination} | ${SITE}`;
    case "stay":
      return `Hotéis em ${page.criteria.destination} | ${SITE}`;
    default: {
      const unreachable: never = page;
      return unreachable;
    }
  }
};

/** Destino da página (h1 e consulta) ou `null` sem destino. */
export const searchPageDestination = (page: SearchPage): string | null => {
  switch (page.kind) {
    case "missing-destination":
      return null;
    case "browse":
      return page.destination;
    case "stay":
      return page.criteria.destination;
    default: {
      const unreachable: never = page;
      return unreachable;
    }
  }
};

type StayCriteria = Extract<SearchPage, { kind: "stay" }>["criteria"];

/**
 * Resumo sob o título: `12–15 dez · 3 noites · 2 adultos · 1 quarto` (o ano só aparece quando a
 * estadia não é no ano de `today`). Sem datas: `Datas não definidas`.
 */
export const describeSearchSummary = (criteria: StayCriteria | null, today: ISODate): string => {
  if (!criteria) return "Datas não definidas";
  const nights = nightsBetween(criteria.checkIn, criteria.checkOut);
  return [
    formatDateRange(criteria.checkIn, criteria.checkOut, today),
    pluralize(nights, "noite", "noites"),
    formatGuests(criteria),
  ].join(" · ");
};
