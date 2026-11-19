import { formatDate, formatDateRange, type ISODate, nightsBetween } from "@/shared/lib/dates";
import { pluralize } from "@/shared/lib/format";
import type { SearchCriteria } from "@/shared/lib/search-params";

/** `2 adultos e 1 criança` (sem criança: `2 adultos`). */
export const describePeople = ({
  adults,
  children,
}: Pick<SearchCriteria, "adults" | "children">): string => {
  const adultsText = pluralize(adults, "adulto", "adultos");
  return children > 0
    ? `${adultsText} e ${pluralize(children, "criança", "crianças")}`
    : adultsText;
};

/** `2 adultos e 1 criança · 1 quarto`. */
export const describeGuestsAndRooms = (criteria: SearchCriteria): string =>
  `${describePeople(criteria)} · ${pluralize(criteria.rooms, "quarto", "quartos")}`;

/** `3 noites`. */
export const describeNights = (criteria: SearchCriteria): string =>
  pluralize(nightsBetween(criteria.checkIn, criteria.checkOut), "noite", "noites");

/** `12–15 dez · 3 noites`. */
export const describeDatesAndNights = (criteria: SearchCriteria, today: ISODate): string =>
  `${formatDateRange(criteria.checkIn, criteria.checkOut, today)} · ${pluralize(nightsBetween(criteria.checkIn, criteria.checkOut), "noite", "noites")}`;

/** `sáb., 12 de dez.` (célula de check-in/check-out). */
export const describeLongDate = (value: ISODate): string => formatDate(value, "long");

/** `Até 3 hóspedes por quarto` (1 → `Acomoda 1 hóspede por quarto`). */
export const describeCapacity = (maxGuests: number): string =>
  maxGuests === 1 ? "Acomoda 1 hóspede por quarto" : `Até ${maxGuests} hóspedes por quarto`;

/** `Visa •••• 1111`-style helpers ficam em `review-labels`. */
export const ageText = (age: string): string => {
  const n = Number(age);
  if (n === 0) return "menos de 1 ano";
  return n === 1 ? "1 ano" : `${n} anos`;
};
