import { commonMessages } from "../i18n/common/messages";
import type { Locale } from "../i18n/config";
import { plural } from "../i18n/messages";

/** `pluralize(1, "noite", "noites")` → `"1 noite"`; 0 e n > 1 usam o plural. */
export const pluralize = (count: number, singular: string, plural: string): string =>
  `${count.toLocaleString("pt-BR")} ${count === 1 ? singular : plural}`;

const ratingFormatters = new Map<Locale, Intl.NumberFormat>();

const ratingFormatter = (locale: Locale): Intl.NumberFormat => {
  const cached = ratingFormatters.get(locale);
  if (cached) return cached;
  const created = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
  ratingFormatters.set(locale, created);
  return created;
};

/** Nota com uma casa decimal: `4,5` em pt-BR e `4.5` em en-US. */
export const formatRating = (rating: number, locale: Locale): string =>
  ratingFormatter(locale).format(rating);

/** Inteiro agrupado pelo idioma: `1.200` em pt-BR e `1,200` em en-US. */
export const formatCount = (count: number, locale: Locale): string => count.toLocaleString(locale);

type GuestCounts = { adults: number; children: number; rooms: number };

const unitText = (
  count: number,
  unit: keyof ReturnType<typeof commonMessages.get>["units"],
  locale: Locale,
): string =>
  `${formatCount(count, locale)} ${plural(count, commonMessages.get(locale).units[unit])}`;

/** `"2 adultos, 1 criança · 1 quarto"`; omite crianças quando zero. */
export const formatGuests = ({ adults, children, rooms }: GuestCounts, locale: Locale): string => {
  const people = [
    unitText(adults, "adult", locale),
    ...(children > 0 ? [unitText(children, "child", locale)] : []),
  ].join(", ");
  return `${people} · ${unitText(rooms, "room", locale)}`;
};

export type RatingLabel = "excellent" | "veryGood" | "good" | "regular";

/** Faixa qualitativa da nota: ≥ 4,5 excelente, ≥ 4,0 muito bom, ≥ 3,5 bom, abaixo regular. */
export const ratingBand = (rating: number): RatingLabel => {
  if (rating >= 4.5) return "excellent";
  if (rating >= 4) return "veryGood";
  if (rating >= 3.5) return "good";
  return "regular";
};

/** Rótulo qualitativo da nota no idioma (Excelente/Muito bom/Bom/Regular). */
export const ratingLabel = (rating: number, locale: Locale): string =>
  commonMessages.get(locale).rating[ratingBand(rating)];
