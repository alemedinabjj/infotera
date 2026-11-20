import { z } from "zod";
import { type ISODate, isBeforeToday, isValidISODate } from "@/shared/lib/dates";
import {
  applySearchCriteriaRules,
  SEARCH_LIMITS,
  SEARCH_MESSAGES,
  type SearchCriteria,
} from "@/shared/lib/search-params";

/** Valores do formulário. Datas e destino são `""` enquanto vazios. */
export type SearchFormValues = {
  destination: string;
  checkIn: string;
  checkOut: string;
  rooms: number;
  adults: number;
  children: number;
};

export const DEFAULT_SEARCH_FORM_VALUES: SearchFormValues = {
  destination: "",
  checkIn: "",
  checkOut: "",
  rooms: 1,
  adults: 2,
  children: 0,
};

/**
 * Mensagens exclusivas do formulário; as demais vêm de `SEARCH_MESSAGES`. "check‑in/out" usa hífen
 * não separável (U+2011) para a palavra não quebrar em duas linhas no mobile.
 */
export const FORM_MESSAGES = {
  checkInRequired: "Escolha a data de check\u2011in.",
  checkOutRequired: "Escolha a data de check\u2011out.",
  checkInPast: "Escolha uma data a partir de hoje.",
} as const;

const countSchema = (min: number, max: number, message: string) =>
  z.number({ message }).int({ message }).min(min, { message }).max(max, { message });

const dateSchema = (requiredMessage: string) =>
  z
    .string()
    .min(1, requiredMessage)
    .refine((value) => value === "" || isValidISODate(value), SEARCH_MESSAGES.date);

/**
 * Schema do formulário de busca. Mesmas regras do `searchCriteriaSchema` (via
 * `applySearchCriteriaRules`), mas com campos `number` (sem coerção) e "check-in ≥ hoje".
 * `today` entra por parâmetro para a regra acompanhar o relógio no momento da validação.
 */
export const makeSearchFormSchema = (today: ISODate): z.ZodType<SearchCriteria, SearchFormValues> =>
  z
    .object({
      destination: z
        .string()
        .trim()
        .min(1, SEARCH_MESSAGES.destination)
        .max(100, SEARCH_MESSAGES.destination),
      checkIn: dateSchema(FORM_MESSAGES.checkInRequired).refine(
        (value) => !isValidISODate(value) || !isBeforeToday(value, today),
        FORM_MESSAGES.checkInPast,
      ),
      checkOut: dateSchema(FORM_MESSAGES.checkOutRequired),
      rooms: countSchema(SEARCH_LIMITS.minRooms, SEARCH_LIMITS.maxRooms, SEARCH_MESSAGES.rooms),
      adults: countSchema(1, SEARCH_LIMITS.maxAdults, SEARCH_MESSAGES.adults),
      children: countSchema(0, SEARCH_LIMITS.maxChildren, SEARCH_MESSAGES.children),
    })
    .superRefine(applySearchCriteriaRules);

/** Critérios (URL, recentes), inteiros ou parciais → valores do formulário (o resto vem dos padrões). */
export const toFormValues = (criteria: Partial<SearchCriteria>): SearchFormValues => ({
  destination: criteria.destination ?? DEFAULT_SEARCH_FORM_VALUES.destination,
  checkIn: criteria.checkIn ?? DEFAULT_SEARCH_FORM_VALUES.checkIn,
  checkOut: criteria.checkOut ?? DEFAULT_SEARCH_FORM_VALUES.checkOut,
  rooms: criteria.rooms ?? DEFAULT_SEARCH_FORM_VALUES.rooms,
  adults: criteria.adults ?? DEFAULT_SEARCH_FORM_VALUES.adults,
  children: criteria.children ?? DEFAULT_SEARCH_FORM_VALUES.children,
});
