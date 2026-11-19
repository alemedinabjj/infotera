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

const plural = (count: number, one: string, many: string): string =>
  `${count} ${count === 1 ? one : many}`;

/** "12–15 dez · 2 adultos, 1 criança · 1 quarto" (sem o destino). */
export const describeRecentDetails = (criteria: SearchCriteria, today: ISODate): string => {
  const guests = [
    plural(criteria.adults, "adulto", "adultos"),
    ...(criteria.children > 0 ? [plural(criteria.children, "criança", "crianças")] : []),
  ].join(", ");
  return [
    formatDateRange(criteria.checkIn, criteria.checkOut, today),
    guests,
    plural(criteria.rooms, "quarto", "quartos"),
  ].join(" · ");
};

/** "São Paulo, SP · 12–15 dez · 2 adultos, 1 criança · 1 quarto". */
export const describeRecentSearch = (criteria: SearchCriteria, today: ISODate): string =>
  `${criteria.destination} · ${describeRecentDetails(criteria, today)}`;
