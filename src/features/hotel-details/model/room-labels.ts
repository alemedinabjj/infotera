import type { RoomAmenity } from "@/shared/api/schemas";
import { DEFAULT_LOCALE, type Locale } from "@/shared/i18n/config";
import { hotelDetailsMessages } from "../i18n/messages";

export const roomAmenityLabel = (amenity: RoomAmenity, locale: Locale = DEFAULT_LOCALE): string =>
  hotelDetailsMessages.get(locale).rooms.amenities[amenity];

/** `Até 3 hóspedes` / `1 hóspede` · `Up to 3 guests` / `1 guest`. */
export const roomCapacityLabel = (maxGuests: number, locale: Locale = DEFAULT_LOCALE): string => {
  const t = hotelDetailsMessages.get(locale).rooms;
  return maxGuests === 1 ? t.capacityOne : t.capacityUpTo({ count: maxGuests });
};

/** `45 m²` (o tamanho pode ter decimais: `32,5 m²` em pt-BR, `32.5 m²` em en-US). */
export const roomSizeLabel = (size: number, locale: Locale = DEFAULT_LOCALE): string =>
  hotelDetailsMessages.get(locale).rooms.size({ size: size.toLocaleString(locale) });

/** Tamanho por extenso para leitor de tela: `45 metros quadrados`. */
export const roomSizeSpoken = (size: number, locale: Locale = DEFAULT_LOCALE): string =>
  hotelDetailsMessages.get(locale).rooms.squareMeters({ size: size.toLocaleString(locale) });

/** `1 tipo de quarto` / `2 tipos de quarto` · `1 room type` / `2 room types`. */
export const roomTypesLabel = (count: number, locale: Locale = DEFAULT_LOCALE): string =>
  hotelDetailsMessages.get(locale).rooms.types({ count });
