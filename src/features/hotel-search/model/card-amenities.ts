import type { Amenity } from "@/shared/api/schemas";

export const CARD_AMENITY_LIMIT = 3;

type PickedAmenities = { shown: Amenity[]; hiddenCount: number };

/**
 * Comodidades do card: as filtradas primeiro (o motivo de o hotel estar na lista), depois as
 * demais na ordem do hotel; até `limit` visíveis e o resto vira "+N".
 */
export const pickCardAmenities = (
  hotelAmenities: readonly Amenity[],
  selected: readonly Amenity[],
  limit: number = CARD_AMENITY_LIMIT,
): PickedAmenities => {
  const matching = hotelAmenities.filter((amenity) => selected.includes(amenity));
  const others = hotelAmenities.filter((amenity) => !selected.includes(amenity));
  const ordered = [...matching, ...others];
  return { shown: ordered.slice(0, limit), hiddenCount: Math.max(ordered.length - limit, 0) };
};
