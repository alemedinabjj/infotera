import { type Room, type RoomAmenity, roomAmenitySchema } from "@/shared/api/schemas";
import { type ComparisonRow, makeRow, NO, YES } from "@/shared/lib/comparison";
import { formatBRL } from "@/shared/lib/currency";
import { bedsLabel } from "@/shared/lib/room-labels";
import type { ComparisonTableMessages } from "@/shared/ui";
import { roomAmenityLabel, roomSizeLabel } from "./room-labels";

export type RoomComparison = { rooms: readonly Room[]; rows: ComparisonRow[] };

const availabilityText = (available: number): string => {
  if (available <= 0) return "Esgotado";
  return available === 1 ? "1 disponível" : `${available} disponíveis`;
};

const priceText = (price: number): string => formatBRL(price, { cents: !Number.isInteger(price) });

const amenityRow = (amenity: RoomAmenity, rooms: readonly Room[]): ComparisonRow =>
  makeRow(
    amenity,
    roomAmenityLabel(amenity),
    "boolean",
    rooms.map((room) => (room.amenities.includes(amenity) ? YES : NO)),
  );

/**
 * Tabela de comparação de todos os quartos do hotel. Linhas fixas (preço, tamanho, hóspedes,
 * camas, disponibilidade) e uma por comodidade que **algum** quarto tem (ordem do enum).
 */
export const buildRoomComparison = (rooms: readonly Room[]): RoomComparison => {
  const present = roomAmenitySchema.options.filter((amenity) =>
    rooms.some((room) => room.amenities.includes(amenity)),
  );
  return {
    rooms,
    rows: [
      makeRow(
        "price",
        "Preço por noite",
        "text",
        rooms.map((room) => priceText(room.pricePerNight)),
      ),
      makeRow(
        "size",
        "Tamanho",
        "text",
        rooms.map((room) => roomSizeLabel(room.size)),
      ),
      makeRow(
        "guests",
        "Hóspedes",
        "text",
        rooms.map((room) => `Até ${room.maxGuests}`),
      ),
      makeRow(
        "beds",
        "Camas",
        "text",
        rooms.map((room) => bedsLabel(room.beds)),
      ),
      makeRow(
        "availability",
        "Disponibilidade",
        "text",
        rooms.map((room) => availabilityText(room.available)),
      ),
      ...present.map((amenity) => amenityRow(amenity, rooms)),
    ],
  };
};

export { onlyDifferences } from "@/shared/lib/comparison";

/** A comparação só faz sentido com 2 ou mais quartos. */
export const canCompare = (rooms: readonly Room[]): boolean => rooms.length >= 2;

/** Anúncio (`aria-live`) do filtro: `Mostrando 6 de 12 características` / `…todas as 12…`. */
export const comparisonAnnouncement = (visible: number, total: number): string =>
  visible === total
    ? `Mostrando todas as ${total} características`
    : `Mostrando ${visible} de ${total} características`;

/** Textos da tabela de comparação de quartos (a molécula de `shared` não tem microcopy). */
export const ROOM_COMPARISON_MESSAGES: ComparisonTableMessages = {
  caption: "Comparar quartos",
  cornerLabel: "Característica",
  onlyDifferences: "Mostrar só diferenças",
  legend: "Linhas marcadas mudam entre os quartos.",
  scrollHint: "Arraste para o lado para ver todos.",
  differs: ", diferente entre os quartos",
  empty: "Os quartos têm as mesmas características.",
  announce: comparisonAnnouncement,
};
