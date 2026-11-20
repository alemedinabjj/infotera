import { DEFAULT_LOCALE, type Locale } from "@/shared/i18n/config";
import { formatUnit } from "@/shared/i18n/units";
import { formatDate, formatDateRange, type ISODate, nightsBetween } from "@/shared/lib/dates";
import type { SearchCriteria } from "@/shared/lib/search-params";
import { checkoutMessages } from "../i18n/messages";

/** `2 adultos e 1 criança` (sem criança: `2 adultos`). */
export const describePeople = (
  { adults, children }: Pick<SearchCriteria, "adults" | "children">,
  locale: Locale = DEFAULT_LOCALE,
): string => {
  const adultsText = formatUnit(adults, "adult", locale);
  return children > 0
    ? `${adultsText} ${checkoutMessages.get(locale).summary.and} ${formatUnit(children, "child", locale)}`
    : adultsText;
};

/** `2 adultos e 1 criança · 1 quarto`. */
export const describeGuestsAndRooms = (
  criteria: SearchCriteria,
  locale: Locale = DEFAULT_LOCALE,
): string => `${describePeople(criteria, locale)} · ${formatUnit(criteria.rooms, "room", locale)}`;

/** `3 noites`. */
export const describeNights = (criteria: SearchCriteria, locale: Locale = DEFAULT_LOCALE): string =>
  formatUnit(nightsBetween(criteria.checkIn, criteria.checkOut), "night", locale);

/** `12–15 dez · 3 noites`. */
export const describeDatesAndNights = (
  criteria: SearchCriteria,
  today: ISODate,
  locale: Locale = DEFAULT_LOCALE,
): string =>
  `${formatDateRange(criteria.checkIn, criteria.checkOut, today, locale)} · ${describeNights(criteria, locale)}`;

/** `sáb., 12 de dez.` (célula de check-in/check-out). */
export const describeLongDate = (value: ISODate, locale: Locale = DEFAULT_LOCALE): string =>
  formatDate(value, "long", locale);

/** `Até 3 hóspedes por quarto` (1 → `Acomoda 1 hóspede por quarto`). */
export const describeCapacity = (maxGuests: number, locale: Locale = DEFAULT_LOCALE): string => {
  const t = checkoutMessages.get(locale).summary;
  return maxGuests === 1 ? t.capacityOne : t.capacity(formatUnit(maxGuests, "guest", locale));
};

/** `1 ano`, `7 anos`, `menos de 1 ano` (a idade chega como texto do `Select`). */
export const ageText = (age: string, locale: Locale = DEFAULT_LOCALE): string =>
  checkoutMessages.get(locale).guests.ageInline(Number(age));
