import { type Room, type RoomAmenity, roomAmenitySchema } from "@/shared/api/schemas";
import { commonMessages } from "@/shared/i18n/common/messages";
import { DEFAULT_LOCALE, type Locale } from "@/shared/i18n/config";
import { type ComparisonRow, makeRow, NO, YES } from "@/shared/lib/comparison";
import { formatBRL } from "@/shared/lib/currency";
import { bedsLabel } from "@/shared/lib/room-labels";
import type { ComparisonTableMessages } from "@/shared/ui";
import { hotelDetailsMessages } from "../i18n/messages";
import { roomAmenityLabel, roomSizeLabel } from "./room-labels";

export type RoomComparison = { rooms: readonly Room[]; rows: ComparisonRow[] };

const availabilityText = (available: number, locale: Locale): string => {
  if (available <= 0) return commonMessages.get(locale).availability.soldOut;
  return hotelDetailsMessages.get(locale).comparison.available({ count: available });
};

const priceText = (price: number, locale: Locale): string =>
  formatBRL(price, { cents: !Number.isInteger(price), locale });

const amenityRow = (amenity: RoomAmenity, rooms: readonly Room[], locale: Locale): ComparisonRow =>
  makeRow(
    amenity,
    roomAmenityLabel(amenity, locale),
    "boolean",
    rooms.map((room) => (room.amenities.includes(amenity) ? YES : NO)),
  );

/**
 * Tabela de comparação de todos os quartos do hotel. Linhas fixas (preço, tamanho, hóspedes,
 * camas, disponibilidade) e uma por comodidade que **algum** quarto tem (ordem do enum).
 */
export const buildRoomComparison = (
  rooms: readonly Room[],
  locale: Locale = DEFAULT_LOCALE,
): RoomComparison => {
  const t = hotelDetailsMessages.get(locale).comparison;
  const present = roomAmenitySchema.options.filter((amenity) =>
    rooms.some((room) => room.amenities.includes(amenity)),
  );
  return {
    rooms,
    rows: [
      makeRow(
        "price",
        t.price,
        "text",
        rooms.map((room) => priceText(room.pricePerNight, locale)),
      ),
      makeRow(
        "size",
        t.size,
        "text",
        rooms.map((room) => roomSizeLabel(room.size, locale)),
      ),
      makeRow(
        "guests",
        t.guests,
        "text",
        rooms.map((room) => t.guestsUpTo({ count: room.maxGuests })),
      ),
      makeRow(
        "beds",
        t.beds,
        "text",
        rooms.map((room) => bedsLabel(room.beds, locale)),
      ),
      makeRow(
        "availability",
        t.availability,
        "text",
        rooms.map((room) => availabilityText(room.available, locale)),
      ),
      ...present.map((amenity) => amenityRow(amenity, rooms, locale)),
    ],
  };
};

export { onlyDifferences } from "@/shared/lib/comparison";

/** A comparação só faz sentido com 2 ou mais quartos. */
export const canCompare = (rooms: readonly Room[]): boolean => rooms.length >= 2;

/** Anúncio (`aria-live`) do filtro: `Mostrando 6 de 12 características` / `…todas as 12…`. */
export const comparisonAnnouncement = (
  visible: number,
  total: number,
  locale: Locale = DEFAULT_LOCALE,
): string => {
  const t = hotelDetailsMessages.get(locale).comparison;
  return visible === total ? t.announceAll({ total }) : t.announceSome({ visible, total });
};

/** Textos da tabela de comparação de quartos (a molécula de `shared` não tem microcopy). */
export const roomComparisonMessages = (
  locale: Locale = DEFAULT_LOCALE,
): ComparisonTableMessages => {
  const t = hotelDetailsMessages.get(locale).comparison;
  return {
    caption: t.caption,
    cornerLabel: t.corner,
    onlyDifferences: t.onlyDifferences,
    legend: t.legend,
    scrollHint: t.scrollHint,
    differs: t.differs,
    empty: t.empty,
    announce: (visible, total) => comparisonAnnouncement(visible, total, locale),
  };
};
