import { formatDateRange, type ISODate, nightsBetween } from "./dates";
import { formatGuests, pluralize } from "./format";
import type { SearchCriteria } from "./search-params";

/**
 * Resumo da estadia: `12–15 dez · 3 noites · 2 adultos · 1 quarto` (o ano só aparece quando a
 * estadia não é no ano de `today`). Usado pelo cabeçalho da busca (F3) e do hotel (F4).
 */
export const describeStay = (criteria: SearchCriteria, today: ISODate): string =>
  [
    formatDateRange(criteria.checkIn, criteria.checkOut, today),
    pluralize(nightsBetween(criteria.checkIn, criteria.checkOut), "noite", "noites"),
    formatGuests(criteria),
  ].join(" · ");
