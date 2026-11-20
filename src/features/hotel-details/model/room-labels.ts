import type { RoomAmenity } from "@/shared/api/schemas";

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

/** `Até 3 hóspedes` / `1 hóspede`. */
export const roomCapacityLabel = (maxGuests: number): string =>
  maxGuests === 1 ? "1 hóspede" : `Até ${maxGuests} hóspedes`;

/** `45 m²` (o tamanho pode ter decimais: `32,5 m²`). */
export const roomSizeLabel = (size: number): string => `${size.toLocaleString("pt-BR")} m²`;

/** `1 tipo de quarto` / `2 tipos de quarto`. */
export const roomTypesLabel = (count: number): string =>
  `${count} ${count === 1 ? "tipo" : "tipos"} de quarto`;
