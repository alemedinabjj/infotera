import type { Hotel, Room } from "@/shared/api/schemas";
import { amenitySchema } from "@/shared/api/schemas";
import { DEFAULT_LOCALE, type Locale } from "@/shared/i18n/config";
import { availabilityStatus } from "@/shared/lib/availability";
import { cancellationDetails } from "@/shared/lib/cancellation";
import { type ComparisonRow, makeRow, NO, YES } from "@/shared/lib/comparison";
import { formatBRL } from "@/shared/lib/currency";
import { formatCount, formatRating, ratingLabel } from "@/shared/lib/format";
import { amenityLabel, propertyTypeLabel } from "@/shared/lib/labels";
import { lowestNightlyPrice } from "@/shared/lib/pricing";
import { comparisonMessages } from "../i18n/messages";

export type HotelComparison = { hotels: readonly Hotel[]; rows: ComparisonRow[] };

/** Índices com o melhor valor; vazio quando todos os candidatos empatam (selo não diz nada). */
const bestIndexes = (values: readonly (number | null)[], pick: "min" | "max"): number[] => {
  const candidates = values.flatMap((value, index) => (value === null ? [] : [{ value, index }]));
  if (candidates.length < 2) return [];
  const target = Math[pick](...candidates.map((item) => item.value));
  const winners = candidates.filter((item) => item.value === target);
  return winners.length === candidates.length ? [] : winners.map((item) => item.index);
};

const roomsOf = (hotel: Hotel, rooms: readonly Room[]): Room[] =>
  rooms.filter((room) => room.hotelId === hotel.id);

/** Preço "a partir de" pelos quartos (como no detalhe); sem quartos, o do hotel. */
const nightly = (hotel: Hotel, rooms: readonly Room[]) => {
  const from = lowestNightlyPrice(roomsOf(hotel, rooms));
  return from ?? { price: hotel.pricePerNight, soldOut: false };
};

const makeRows = (locale: Locale) => {
  const m = comparisonMessages.get(locale);
  const priceText = (price: number): string =>
    formatBRL(price, { cents: !Number.isInteger(price), locale });

  const priceRow = (hotels: readonly Hotel[], rooms: readonly Room[]): ComparisonRow => {
    const prices = hotels.map((hotel) => nightly(hotel, rooms));
    const row = makeRow(
      "price",
      m.rows.price,
      "text",
      prices.map((item) => {
        const text = m.rows.priceFrom(priceText(item.price));
        return item.soldOut ? `${text} · ${m.rows.soldOutNote}` : text;
      }),
    );
    const candidates = prices.map((item) => (item.soldOut ? null : item.price));
    return {
      ...row,
      best: bestIndexes(candidates, "min"),
      bestLabel: m.badges.cheapest,
    };
  };

  const ratingRow = (hotels: readonly Hotel[]): ComparisonRow => ({
    ...makeRow(
      "rating",
      m.rows.rating,
      "text",
      hotels.map(
        (hotel) => `${formatRating(hotel.rating, locale)} · ${ratingLabel(hotel.rating, locale)}`,
      ),
    ),
    best: bestIndexes(
      hotels.map((hotel) => hotel.rating),
      "max",
    ),
    bestLabel: m.badges.bestRated,
  });

  const availabilityText = (hotel: Hotel): string => {
    switch (availabilityStatus(hotel.availableRooms, 1)) {
      case "sold-out":
        return m.rows.soldOut;
      case "scarce":
        return m.rows.scarce(hotel.availableRooms);
      default:
        return m.rows.available;
    }
  };

  const textRows = (hotels: readonly Hotel[], rooms: readonly Room[]): ComparisonRow[] => {
    const guests = hotels.map((hotel) => {
      const own = roomsOf(hotel, rooms);
      return own.length === 0
        ? m.rows.unknown
        : m.rows.guestsValue(Math.max(...own.map((room) => room.maxGuests)));
    });
    return [
      makeRow(
        "reviews",
        m.rows.reviews,
        "text",
        hotels.map((hotel) => formatCount(hotel.reviewCount, locale)),
      ),
      makeRow(
        "type",
        m.rows.type,
        "text",
        hotels.map((hotel) => propertyTypeLabel(hotel.propertyType, locale)),
      ),
      makeRow(
        "destination",
        m.rows.destination,
        "text",
        hotels.map((hotel) => hotel.destination),
      ),
      makeRow(
        "cancellation",
        m.rows.cancellation,
        "text",
        hotels.map((hotel) => cancellationDetails(hotel.cancellationPolicy, locale).label),
      ),
      makeRow(
        "check-in",
        m.rows.checkIn,
        "text",
        hotels.map((hotel) => m.rows.checkInValue(hotel.checkInTime)),
      ),
      makeRow(
        "check-out",
        m.rows.checkOut,
        "text",
        hotels.map((hotel) => m.rows.checkOutValue(hotel.checkOutTime)),
      ),
      makeRow("availability", m.rows.availability, "text", hotels.map(availabilityText)),
      makeRow(
        "room-types",
        m.rows.roomTypes,
        "text",
        hotels.map((hotel) => {
          const count = roomsOf(hotel, rooms).length;
          return count === 0 ? m.rows.unknown : m.rows.roomTypesValue(count);
        }),
      ),
      makeRow("guests", m.rows.guests, "text", guests),
    ];
  };

  return { priceRow, ratingRow, textRows };
};

/**
 * Linhas da comparação lado a lado. Fixas (preço pelos quartos, nota, avaliações, tipo, destino,
 * cancelamento, check-in/out, disponibilidade, quartos, hóspedes) e uma por comodidade que
 * **algum** hotel tem (ordem do enum). `best` marca menor preço e maior nota.
 */
export const buildHotelComparison = (
  hotels: readonly Hotel[],
  rooms: readonly Room[],
  locale: Locale = DEFAULT_LOCALE,
): HotelComparison => {
  const { priceRow, ratingRow, textRows } = makeRows(locale);
  const present = amenitySchema.options.filter((amenity) =>
    hotels.some((hotel) => hotel.amenities.includes(amenity)),
  );
  return {
    hotels,
    rows: [
      priceRow(hotels, rooms),
      ratingRow(hotels),
      ...textRows(hotels, rooms),
      ...present.map((amenity) =>
        makeRow(
          amenity,
          amenityLabel(amenity, locale),
          "boolean",
          hotels.map((hotel) => (hotel.amenities.includes(amenity) ? YES : NO)),
        ),
      ),
    ],
  };
};
