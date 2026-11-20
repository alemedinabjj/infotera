import { DEFAULT_LOCALE, type Locale } from "@/shared/i18n/config";
import { formatUnit } from "@/shared/i18n/units";
import { formatDateRange, type ISODate, isBeforeToday } from "@/shared/lib/dates";
import {
  type SearchCriteria,
  searchCriteriaSchema,
  searchCriteriaToQueryString,
} from "@/shared/lib/search-params";
import {
  DEFAULT_SEARCH_FORM_VALUES,
  type SearchFormValues,
  toFormValues,
} from "./search-form.schema";

/** Chave dentro do `createStorage("local")` (vira `infotera:recent-searches`). */
export const RECENT_SEARCHES_KEY = "recent-searches";
export const MAX_RECENT = 5;

/** Descarta item a item o que não passar no schema (storage antigo ou adulterado). */
export const parseRecentSearches = (raw: readonly unknown[]): SearchCriteria[] =>
  raw
    .flatMap((item) => {
      const parsed = searchCriteriaSchema.safeParse(item);
      return parsed.success ? [parsed.data] : [];
    })
    .slice(0, MAX_RECENT);

/** JSON cru do storage → lista válida. Ausente, não-JSON ou que não seja array = lista vazia. */
export const parseRecentSearchesJson = (raw: string | null): SearchCriteria[] => {
  if (raw === null) return [];
  try {
    const value: unknown = JSON.parse(raw);
    return Array.isArray(value) ? parseRecentSearches(value) : [];
  } catch {
    return [];
  }
};

/** Coloca a busca no topo, remove a duplicata (mesma URL) e corta em `MAX_RECENT`. */
export const addRecentSearch = (
  list: readonly SearchCriteria[],
  criteria: SearchCriteria,
): SearchCriteria[] => {
  const key = searchCriteriaToQueryString(criteria);
  const others = list.filter((item) => searchCriteriaToQueryString(item) !== key);
  return [criteria, ...others].slice(0, MAX_RECENT);
};

/** `true` quando o check-in da busca já passou. */
export const hasExpiredDates = (criteria: SearchCriteria, today: ISODate): boolean =>
  isBeforeToday(criteria.checkIn, today);

type RestoredSearch = { values: SearchFormValues; datesExpired: boolean };

/** Valores do formulário a partir de uma busca salva; datas passadas ficam vazias. */
export const restoreRecentSearch = (criteria: SearchCriteria, today: ISODate): RestoredSearch => {
  const values = toFormValues(criteria);
  if (!hasExpiredDates(criteria, today)) return { values, datesExpired: false };
  return {
    values: {
      ...values,
      checkIn: DEFAULT_SEARCH_FORM_VALUES.checkIn,
      checkOut: DEFAULT_SEARCH_FORM_VALUES.checkOut,
    },
    datesExpired: true,
  };
};

/** "12–15 dez · 2 adultos, 1 criança · 1 quarto" (sem o destino). */
export const describeRecentDetails = (
  criteria: SearchCriteria,
  today: ISODate,
  locale: Locale = DEFAULT_LOCALE,
): string => {
  const guests = [
    formatUnit(criteria.adults, "adult", locale),
    ...(criteria.children > 0 ? [formatUnit(criteria.children, "child", locale)] : []),
  ].join(", ");
  return [
    formatDateRange(criteria.checkIn, criteria.checkOut, today, locale),
    guests,
    formatUnit(criteria.rooms, "room", locale),
  ].join(" · ");
};

/** "São Paulo, SP · 12–15 dez · 2 adultos, 1 criança · 1 quarto". */
export const describeRecentSearch = (
  criteria: SearchCriteria,
  today: ISODate,
  locale: Locale = DEFAULT_LOCALE,
): string => `${criteria.destination} · ${describeRecentDetails(criteria, today, locale)}`;
