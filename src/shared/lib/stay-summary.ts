import { DEFAULT_LOCALE, type Locale } from "../i18n/config";
import { formatUnit } from "../i18n/units";
import { formatDateRange, type ISODate, nightsBetween } from "./dates";
import { formatGuests } from "./format";
import type { SearchCriteria } from "./search-params";

/**
 * Resumo da estadia: `12–15 dez · 3 noites · 2 adultos · 1 quarto` (o ano só aparece quando a
 * estadia não é no ano de `today`). Usado pelo cabeçalho da busca (F3) e do hotel (F4).
 */
export const describeStay = (
  criteria: SearchCriteria,
  today: ISODate,
  locale: Locale = DEFAULT_LOCALE,
): string =>
  [
    formatDateRange(criteria.checkIn, criteria.checkOut, today, locale),
    formatUnit(nightsBetween(criteria.checkIn, criteria.checkOut), "night", locale),
    formatGuests(criteria, locale),
  ].join(" · ");
