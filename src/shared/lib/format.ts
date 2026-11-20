/** `pluralize(1, "noite", "noites")` → `"1 noite"`; 0 e n > 1 usam o plural. */
export const pluralize = (count: number, singular: string, plural: string): string =>
  `${count.toLocaleString("pt-BR")} ${count === 1 ? singular : plural}`;

const ratingFormatter = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

/** Nota com uma casa decimal e vírgula: `4,5`. */
export const formatRating = (rating: number): string => ratingFormatter.format(rating);

type GuestCounts = { adults: number; children: number; rooms: number };

/** `"2 adultos, 1 criança · 1 quarto"`; omite crianças quando zero. */
export const formatGuests = ({ adults, children, rooms }: GuestCounts): string => {
  const people = [
    pluralize(adults, "adulto", "adultos"),
    ...(children > 0 ? [pluralize(children, "criança", "crianças")] : []),
  ].join(", ");
  return `${people} · ${pluralize(rooms, "quarto", "quartos")}`;
};
