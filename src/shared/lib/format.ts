import { DEFAULT_LOCALE, type Locale } from "../i18n/config";

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
export const formatRating = (rating: number, locale: Locale = DEFAULT_LOCALE): string =>
  ratingFormatter(locale).format(rating);

/** Inteiro agrupado pelo idioma: `1.200` em pt-BR e `1,200` em en-US. */
export const formatCount = (count: number, locale: Locale = DEFAULT_LOCALE): string =>
  count.toLocaleString(locale);

type GuestCounts = { adults: number; children: number; rooms: number };

/** `"2 adultos, 1 criança · 1 quarto"`; omite crianças quando zero. */
export const formatGuests = ({ adults, children, rooms }: GuestCounts): string => {
  const people = [
    pluralize(adults, "adulto", "adultos"),
    ...(children > 0 ? [pluralize(children, "criança", "crianças")] : []),
  ].join(", ");
  return `${people} · ${pluralize(rooms, "quarto", "quartos")}`;
};

export type RatingLabel = "Excelente" | "Muito bom" | "Bom" | "Regular";

/** Rótulo qualitativo da nota: ≥ 4,5 Excelente, ≥ 4,0 Muito bom, ≥ 3,5 Bom, abaixo Regular. */
export const ratingLabel = (rating: number): RatingLabel => {
  if (rating >= 4.5) return "Excelente";
  if (rating >= 4) return "Muito bom";
  if (rating >= 3.5) return "Bom";
  return "Regular";
};
