import { z } from "@/shared/lib/zod";
import { DEFAULT_LOCALE, type Locale } from "../i18n/config";

/** Data de calendário no formato `YYYY-MM-DD` (sem hora e sem fuso). */
export type ISODate = string;

const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const MS_PER_DAY = 86_400_000;

type DateParts = { year: number; month: number; day: number };

const parseParts = (value: string): DateParts | null => {
  const match = ISO_DATE_PATTERN.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const utc = new Date(Date.UTC(year, month - 1, day));
  const isRealDate =
    utc.getUTCFullYear() === year && utc.getUTCMonth() === month - 1 && utc.getUTCDate() === day;
  return isRealDate ? { year, month, day } : null;
};

/** `true` quando `value` é `YYYY-MM-DD` e existe no calendário (rejeita 2026-02-30). */
export const isValidISODate = (value: string): boolean => parseParts(value) !== null;

/** Schema de fronteira para datas `YYYY-MM-DD` válidas. */
export const isoDateSchema = z.string().refine(isValidISODate, {
  message: "Data inválida. Use o formato AAAA-MM-DD.",
});

const pad = (n: number, size = 2): string => String(n).padStart(size, "0");

const formatUTC = (date: Date): ISODate =>
  `${pad(date.getUTCFullYear(), 4)}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;

const toUTCms = (value: ISODate): number => {
  const parts = parseParts(value);
  if (!parts) throw new RangeError(`Data inválida: ${value}`);
  return Date.UTC(parts.year, parts.month - 1, parts.day);
};

/** Converte um `Date` na data que o usuário vê no calendário (getters locais). */
export const toISODate = (date: Date): ISODate =>
  `${pad(date.getFullYear(), 4)}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

/** Fuso do produto (hotéis brasileiros): o servidor roda em UTC e não pode decidir "hoje" sozinho. */
const PRODUCT_TIME_ZONE = "America/Sao_Paulo";

const todayFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: PRODUCT_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/**
 * Hoje no calendário de `America/Sao_Paulo`, no servidor e no cliente (um `Date` em UTC às 23:30
 * de Brasília já é "amanhã" em UTC, e o aviso de datas passadas erraria).
 */
export const todayISO = (now: Date = new Date()): ISODate => {
  const parts = todayFormatter.formatToParts(now);
  const part = (type: string): string => parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
};

/** Soma `days` (pode ser negativo) a uma data, em UTC por componentes. */
export const addDays = (value: ISODate, days: number): ISODate =>
  formatUTC(new Date(toUTCms(value) + days * MS_PER_DAY));

/** Número de noites entre check-in e check-out (negativo se invertidos). */
export const nightsBetween = (checkIn: ISODate, checkOut: ISODate): number =>
  Math.round((toUTCms(checkOut) - toUTCms(checkIn)) / MS_PER_DAY);

/** `true` quando `value` é estritamente anterior a `today` (ambas `YYYY-MM-DD`). */
export const isBeforeToday = (value: ISODate, today: ISODate): boolean =>
  toUTCms(value) < toUTCms(today);

type DateFormat = "short" | "long" | "medium";

const OPTIONS: Readonly<Record<DateFormat, Intl.DateTimeFormatOptions>> = {
  short: { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" },
  long: { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" },
  medium: { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" },
};

const dateFormatters = new Map<string, Intl.DateTimeFormat>();

const dateFormatter = (locale: Locale, format: DateFormat): Intl.DateTimeFormat => {
  const key = `${locale}:${format}`;
  const cached = dateFormatters.get(key);
  if (cached) return cached;
  const created = new Intl.DateTimeFormat(locale, OPTIONS[format]);
  dateFormatters.set(key, created);
  return created;
};

/**
 * Formata uma data ISO sem off-by-one de fuso. `short` = `01/12/2026` (pt-BR) ou `12/01/2026`
 * (en-US); `medium` = `1 de dez. de 2026` ou `Dec 1, 2026`; `long` inclui o dia da semana.
 */
export const formatDate = (
  value: ISODate,
  format: DateFormat = "short",
  locale: Locale = DEFAULT_LOCALE,
): string => dateFormatter(locale, format).format(new Date(toUTCms(value)));

const MONTHS_SHORT: Readonly<Record<Locale, readonly string[]>> = {
  "pt-BR": ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"],
  "en-US": ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
};

type DayMonthYear = { day: number; month: string; year: number };

const toDayMonthYear = (value: ISODate, locale: Locale): DayMonthYear => {
  const date = new Date(toUTCms(value));
  return {
    day: date.getUTCDate(),
    month: MONTHS_SHORT[locale][date.getUTCMonth()] ?? "",
    year: date.getUTCFullYear(),
  };
};

/** `12 dez` (pt-BR) ou `Dec 12` (en-US), com o ano quando pedido (`Dec 12, 2027`). */
const dayAndMonth = (part: DayMonthYear, locale: Locale, withYear: boolean): string => {
  if (locale === "en-US") return `${part.month} ${part.day}${withYear ? `, ${part.year}` : ""}`;
  return `${part.day} ${part.month}${withYear ? ` ${part.year}` : ""}`;
};

/**
 * Período curto para listas e resumos: `12–15 dez` / `Dec 12–15` (mesmo mês), `30 dez – 2 jan` /
 * `Dec 30 – Jan 2` (meses diferentes). O ano só aparece quando alguma das pontas não é o ano de `today`.
 */
export const formatDateRange = (
  checkIn: ISODate,
  checkOut: ISODate,
  today: ISODate,
  locale: Locale = DEFAULT_LOCALE,
): string => {
  const start = toDayMonthYear(checkIn, locale);
  const end = toDayMonthYear(checkOut, locale);
  const currentYear = toDayMonthYear(today, locale).year;
  const showYear = start.year !== currentYear || end.year !== currentYear;
  if (start.year !== end.year) {
    return `${dayAndMonth(start, locale, true)} – ${dayAndMonth(end, locale, true)}`;
  }
  if (start.month !== end.month) {
    return `${dayAndMonth(start, locale, false)} – ${dayAndMonth(end, locale, showYear)}`;
  }
  if (locale === "en-US") {
    return `${start.month} ${start.day}–${end.day}${showYear ? `, ${end.year}` : ""}`;
  }
  return `${start.day}–${end.day} ${end.month}${showYear ? ` ${end.year}` : ""}`;
};
