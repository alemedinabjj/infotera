import type { ISODate } from "@/shared/lib/dates";
import {
  parseDestinationParam,
  parseSearchCriteria,
  type SearchCriteria,
  searchCriteriaToQueryString,
} from "@/shared/lib/search-params";
import { describeStay } from "@/shared/lib/stay-summary";

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
export const describeSearchSummary = (criteria: StayCriteria | null, today: ISODate): string =>
  criteria ? describeStay(criteria, today) : "Datas não definidas";

/** Chave de remontagem dos formulários/cabeçalho: muda quando os critérios mudam (nova busca). */
export const searchPageKey = (page: SearchPage): string => {
  switch (page.kind) {
    case "missing-destination":
      return "missing";
    case "browse":
      return `browse:${page.destination}`;
    case "stay":
      return searchCriteriaToQueryString(page.criteria);
    default: {
      const unreachable: never = page;
      return unreachable;
    }
  }
};
