import type { Bed, RoomAmenity } from "@/shared/api/schemas";

const ROOM_AMENITY_LABELS: Record<RoomAmenity, string> = {
  ocean_view: "Vista para o mar",
  city_view: "Vista para a cidade",
  garden_view: "Vista para o jardim",
  balcony: "Varanda",
  terrace: "Terraço",
  bathtub: "Banheira",
  minibar: "Frigobar",
  safe: "Cofre",
  aircon: "Ar-condicionado",
  desk: "Mesa de trabalho",
  kitchen: "Cozinha",
  living_room: "Sala de estar",
  sound_system: "Sistema de som",
  butler: "Mordomo",
  pool_access: "Acesso à piscina",
  garden: "Jardim privativo",
  lounge_access: "Acesso ao lounge",
};

export const roomAmenityLabel = (amenity: RoomAmenity): string => ROOM_AMENITY_LABELS[amenity];

const BED_LABELS: Record<Bed["type"], { one: string; many: string }> = {
  single: { one: "cama de solteiro", many: "camas de solteiro" },
  double: { one: "cama de casal", many: "camas de casal" },
  queen: { one: "cama queen", many: "camas queen" },
  king: { one: "cama king", many: "camas king" },
  twin: { one: "cama twin", many: "camas twin" },
  sofa_bed: { one: "sofá-cama", many: "sofás-camas" },
};

const bedText = ({ type, quantity }: Bed): string =>
  `${quantity} ${quantity === 1 ? BED_LABELS[type].one : BED_LABELS[type].many}`;

/** `1 cama king` · `1 cama king e 1 sofá-cama` · `1 cama king, 2 camas twin e 1 sofá-cama`. */
export const bedsLabel = (beds: readonly Bed[]): string => {
  const parts = beds.map(bedText);
  const last = parts.at(-1);
  if (last === undefined) return "";
  if (parts.length === 1) return last;
  return `${parts.slice(0, -1).join(", ")} e ${last}`;
};

/** `Até 3 hóspedes` / `1 hóspede`. */
export const roomCapacityLabel = (maxGuests: number): string =>
  maxGuests === 1 ? "1 hóspede" : `Até ${maxGuests} hóspedes`;

/** `45 m²` (o tamanho pode ter decimais: `32,5 m²`). */
export const roomSizeLabel = (size: number): string => `${size.toLocaleString("pt-BR")} m²`;

/** `1 tipo de quarto` / `2 tipos de quarto`. */
export const roomTypesLabel = (count: number): string =>
  `${count} ${count === 1 ? "tipo" : "tipos"} de quarto`;
