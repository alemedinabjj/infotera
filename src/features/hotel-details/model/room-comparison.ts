import { type Room, type RoomAmenity, roomAmenitySchema } from "@/shared/api/schemas";
import { formatBRL } from "@/shared/lib/currency";
import { bedsLabel, roomAmenityLabel, roomSizeLabel } from "./room-labels";

export const YES = "Sim";
export const NO = "Não";

export type ComparisonRow = {
  key: string;
  label: string;
  /** `boolean`: células `Sim`/`Não` (ícone + texto); `text`: texto puro. */
  kind: "text" | "boolean";
  /** Uma célula por quarto, na ordem de `rooms`. */
  cells: string[];
  /** Nem todas as células são iguais. */
  differs: boolean;
};

export type RoomComparison = { rooms: readonly Room[]; rows: ComparisonRow[] };

const availabilityText = (available: number): string => {
  if (available <= 0) return "Esgotado";
  return available === 1 ? "1 disponível" : `${available} disponíveis`;
};

const priceText = (price: number): string => formatBRL(price, { cents: !Number.isInteger(price) });

const makeRow = (
  key: string,
  label: string,
  kind: ComparisonRow["kind"],
  cells: string[],
): ComparisonRow => ({ key, label, kind, cells, differs: new Set(cells).size > 1 });

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

/** Só as linhas em que os quartos diferem. */
export const onlyDifferences = (rows: readonly ComparisonRow[]): ComparisonRow[] =>
  rows.filter((row) => row.differs);

/** A comparação só faz sentido com 2 ou mais quartos. */
export const canCompare = (rooms: readonly Room[]): boolean => rooms.length >= 2;

/** Anúncio (`aria-live`) do filtro: `Mostrando 6 de 12 características` / `…todas as 12…`. */
export const comparisonAnnouncement = (visible: number, total: number): string =>
  visible === total
    ? `Mostrando todas as ${total} características`
    : `Mostrando ${visible} de ${total} características`;
