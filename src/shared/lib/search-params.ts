import { z } from "@/shared/lib/zod";
import { commonMessages } from "../i18n/common/messages";
import { DEFAULT_LOCALE, type Locale } from "../i18n/config";
import { isoDateSchema, nightsBetween } from "./dates";

export const SEARCH_PARAM_KEYS = [
  "destination",
  "checkIn",
  "checkOut",
  "rooms",
  "adults",
  "children",
] as const;

type SearchParamKey = (typeof SEARCH_PARAM_KEYS)[number];

export const SEARCH_LIMITS = {
  minRooms: 1,
  maxRooms: 4,
  maxAdults: 16,
  maxChildren: 10,
  maxGuestsPerRoom: 5,
  minNights: 1,
  maxNights: 30,
} as const;

export type SearchMessages = ReturnType<typeof searchMessages>;

/** Mensagens de validação dos critérios de busca no idioma (reusadas pelo formulário da F2). */
export const searchMessages = (locale: Locale = DEFAULT_LOCALE) => {
  const t = commonMessages.get(locale).validation.search;
  return {
    destination: t.destination,
    date: t.date,
    rooms: t.rooms({ min: SEARCH_LIMITS.minRooms, max: SEARCH_LIMITS.maxRooms }),
    adults: t.adults({ max: SEARCH_LIMITS.maxAdults }),
    children: t.children({ max: SEARCH_LIMITS.maxChildren }),
    checkOutOrder: t.checkOutOrder,
    maxNights: t.maxNights({ max: SEARCH_LIMITS.maxNights }),
    adultsPerRoom: t.adultsPerRoom,
    guestsPerRoom: t.guestsPerRoom({ max: SEARCH_LIMITS.maxGuestsPerRoom }),
  };
};

export const SEARCH_MESSAGES = searchMessages();

const countSchema = (min: number, max: number, message: string) =>
  z.coerce.number({ message }).int({ message }).min(min, { message }).max(max, { message });

type RuleValue = {
  checkIn: string;
  checkOut: string;
  rooms: number;
  adults: number;
  children: number;
};

/**
 * Regras que cruzam campos (noites, adultos por quarto, hóspedes por quarto). Compartilhada com o
 * schema do formulário da F2 para existir uma única fonte da verdade.
 */
export const applySearchCriteriaRules = (
  value: RuleValue,
  ctx: z.RefinementCtx,
  messages: SearchMessages = SEARCH_MESSAGES,
): void => {
  const datesOk =
    isoDateSchema.safeParse(value.checkIn).success &&
    isoDateSchema.safeParse(value.checkOut).success;
  if (datesOk) {
    const nights = nightsBetween(value.checkIn, value.checkOut);
    if (nights < SEARCH_LIMITS.minNights) {
      ctx.addIssue({ code: "custom", path: ["checkOut"], message: messages.checkOutOrder });
    } else if (nights > SEARCH_LIMITS.maxNights) {
      ctx.addIssue({ code: "custom", path: ["checkOut"], message: messages.maxNights });
    }
  }
  if (value.adults < value.rooms) {
    ctx.addIssue({ code: "custom", path: ["adults"], message: messages.adultsPerRoom });
  }
  if (value.adults + value.children > value.rooms * SEARCH_LIMITS.maxGuestsPerRoom) {
    ctx.addIssue({ code: "custom", path: ["children"], message: messages.guestsPerRoom });
  }
};

const destinationSchema = z
  .string()
  .trim()
  .min(1, SEARCH_MESSAGES.destination)
  .max(100, SEARCH_MESSAGES.destination);

/**
 * Critérios de busca. Valida só o que não depende do relógio (formato, calendário, limites);
 * "check-in no passado" é avaliado no cliente com `isBeforeToday`.
 */
export const searchCriteriaSchema = z
  .object({
    destination: destinationSchema,
    checkIn: isoDateSchema,
    checkOut: isoDateSchema,
    rooms: countSchema(SEARCH_LIMITS.minRooms, SEARCH_LIMITS.maxRooms, SEARCH_MESSAGES.rooms),
    adults: countSchema(1, SEARCH_LIMITS.maxAdults, SEARCH_MESSAGES.adults),
    children: countSchema(0, SEARCH_LIMITS.maxChildren, SEARCH_MESSAGES.children),
  })
  .superRefine((value, ctx) => applySearchCriteriaRules(value, ctx));

export type SearchCriteria = z.infer<typeof searchCriteriaSchema>;

export type SearchCriteriaIssue = { path: SearchParamKey; message: string };

export type ParseSearchCriteriaResult =
  | { success: true; data: SearchCriteria }
  | { success: false; issues: SearchCriteriaIssue[] };

type SearchParamsInput = URLSearchParams | Record<string, string | string[] | undefined>;

const isParamKey = (key: unknown): key is SearchParamKey =>
  SEARCH_PARAM_KEYS.some((candidate) => candidate === key);

const readParam = (input: SearchParamsInput, key: SearchParamKey): string | undefined => {
  const raw = input instanceof URLSearchParams ? (input.get(key) ?? undefined) : input[key];
  const value = Array.isArray(raw) ? raw[0] : raw;
  return value === undefined || value.trim() === "" ? undefined : value;
};

/**
 * Lê os critérios de busca de `URLSearchParams` ou do `searchParams` resolvido do Next.
 * Arrays usam o primeiro valor; chaves extras (filtros) são ignoradas.
 */
export const parseSearchCriteria = (input: SearchParamsInput): ParseSearchCriteriaResult => {
  const raw = Object.fromEntries(SEARCH_PARAM_KEYS.map((key) => [key, readParam(input, key)]));
  const result = searchCriteriaSchema.safeParse(raw);
  if (result.success) return { success: true, data: result.data };
  const issues = result.error.issues.flatMap((issue): SearchCriteriaIssue[] => {
    const path = issue.path[0];
    return isParamKey(path) ? [{ path, message: issue.message }] : [];
  });
  return { success: false, issues };
};

/** Serializa os critérios com a ordem fixa de `SEARCH_PARAM_KEYS` (URLs estáveis). */
export const serializeSearchCriteria = (criteria: SearchCriteria): URLSearchParams =>
  new URLSearchParams([
    ["destination", criteria.destination],
    ["checkIn", criteria.checkIn],
    ["checkOut", criteria.checkOut],
    ["rooms", String(criteria.rooms)],
    ["adults", String(criteria.adults)],
    ["children", String(criteria.children)],
  ]);

/** Igual a `serializeSearchCriteria`, como string sem o `?`. */
export const searchCriteriaToQueryString = (criteria: SearchCriteria): string =>
  serializeSearchCriteria(criteria).toString();

/** Hóspedes por quarto (arredondado para cima); a F4 compara com `maxGuests`. */
export const guestsPerRoom = (
  criteria: Pick<SearchCriteria, "adults" | "children" | "rooms">,
): number => Math.ceil((criteria.adults + criteria.children) / criteria.rooms);

/**
 * Destino de um param de URL (mesmas regras dos critérios: sem espaços nas pontas, 1–100
 * caracteres). Array usa o primeiro valor. `null` quando ausente ou inválido.
 */
export const parseDestinationParam = (input: string | string[] | undefined): string | null => {
  const value = Array.isArray(input) ? input[0] : input;
  const result = destinationSchema.safeParse(value);
  return result.success ? result.data : null;
};
