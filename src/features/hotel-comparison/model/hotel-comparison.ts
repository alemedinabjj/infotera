import type { Hotel, Room } from "@/shared/api/schemas";
import { amenitySchema } from "@/shared/api/schemas";
import { availabilityStatus } from "@/shared/lib/availability";
import { cancellationDetails } from "@/shared/lib/cancellation";
import { type ComparisonRow, makeRow, NO, YES } from "@/shared/lib/comparison";
import { formatBRL } from "@/shared/lib/currency";
import { formatRating, ratingLabel } from "@/shared/lib/format";
import { amenityLabel, propertyTypeLabel } from "@/shared/lib/labels";
import { lowestNightlyPrice } from "@/shared/lib/pricing";
import { COMPARISON_MESSAGES } from "./messages";

const ROWS = COMPARISON_MESSAGES.rows;

export type HotelComparison = { hotels: readonly Hotel[]; rows: ComparisonRow[] };

const priceText = (price: number): string => formatBRL(price, { cents: !Number.isInteger(price) });

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

const priceRow = (hotels: readonly Hotel[], rooms: readonly Room[]): ComparisonRow => {
  const prices = hotels.map((hotel) => nightly(hotel, rooms));
  const row = makeRow(
    "price",
    ROWS.price,
    "text",
    prices.map((item) => {
      const text = ROWS.priceFrom(priceText(item.price));
      return item.soldOut ? `${text} · ${ROWS.soldOutNote}` : text;
    }),
  );
  const candidates = prices.map((item) => (item.soldOut ? null : item.price));
  return {
    ...row,
    best: bestIndexes(candidates, "min"),
    bestLabel: COMPARISON_MESSAGES.badges.cheapest,
  };
};

const ratingRow = (hotels: readonly Hotel[]): ComparisonRow => ({
  ...makeRow(
    "rating",
    ROWS.rating,
    "text",
    hotels.map((hotel) => `${formatRating(hotel.rating)} · ${ratingLabel(hotel.rating)}`),
  ),
  best: bestIndexes(
    hotels.map((hotel) => hotel.rating),
    "max",
  ),
  bestLabel: COMPARISON_MESSAGES.badges.bestRated,
});

const availabilityText = (hotel: Hotel): string => {
  switch (availabilityStatus(hotel.availableRooms, 1)) {
    case "sold-out":
      return ROWS.soldOut;
    case "scarce":
      return ROWS.scarce(hotel.availableRooms);
    default:
      return ROWS.available;
  }
};

const textRows = (hotels: readonly Hotel[], rooms: readonly Room[]): ComparisonRow[] => {
  const guests = hotels.map((hotel) => {
    const own = roomsOf(hotel, rooms);
    return own.length === 0
      ? ROWS.unknown
      : ROWS.guestsValue(Math.max(...own.map((room) => room.maxGuests)));
  });
  return [
    makeRow(
      "reviews",
      ROWS.reviews,
      "text",
      hotels.map((hotel) => hotel.reviewCount.toLocaleString("pt-BR")),
    ),
    makeRow(
      "type",
      ROWS.type,
      "text",
      hotels.map((hotel) => propertyTypeLabel(hotel.propertyType)),
    ),
    makeRow(
      "destination",
      ROWS.destination,
      "text",
      hotels.map((hotel) => hotel.destination),
    ),
    makeRow(
      "cancellation",
      ROWS.cancellation,
      "text",
      hotels.map((hotel) => cancellationDetails(hotel.cancellationPolicy).label),
    ),
    makeRow(
      "check-in",
      ROWS.checkIn,
      "text",
      hotels.map((hotel) => ROWS.checkInValue(hotel.checkInTime)),
    ),
    makeRow(
      "check-out",
      ROWS.checkOut,
      "text",
      hotels.map((hotel) => ROWS.checkOutValue(hotel.checkOutTime)),
    ),
    makeRow("availability", ROWS.availability, "text", hotels.map(availabilityText)),
    makeRow(
      "room-types",
      ROWS.roomTypes,
      "text",
      hotels.map((hotel) => {
        const count = roomsOf(hotel, rooms).length;
        return count === 0 ? ROWS.unknown : ROWS.roomTypesValue(count);
      }),
    ),
    makeRow("guests", ROWS.guests, "text", guests),
  ];
};

/**
 * Linhas da comparação lado a lado. Fixas (preço pelos quartos, nota, avaliações, tipo, destino,
 * cancelamento, check-in/out, disponibilidade, quartos, hóspedes) e uma por comodidade que
 * **algum** hotel tem (ordem do enum). `best` marca menor preço e maior nota.
 */
export const buildHotelComparison = (
  hotels: readonly Hotel[],
  rooms: readonly Room[],
): HotelComparison => {
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
          amenityLabel(amenity),
          "boolean",
          hotels.map((hotel) => (hotel.amenities.includes(amenity) ? YES : NO)),
        ),
      ),
    ],
  };
};
