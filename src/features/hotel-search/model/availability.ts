/** Quartos restantes a partir dos quais o card avisa que está acabando. */
export const SCARCE_THRESHOLD = 2;

export type AvailabilityStatus = "sold-out" | "insufficient" | "scarce" | "available";

/**
 * Disponibilidade do hotel para a busca: sem quartos (`sold-out`), menos quartos que o pedido
 * (`insufficient`), poucos (`scarce`, ≤ 2) ou `available`. No modo `browse` use `requestedRooms = 1`.
 */
export const availabilityStatus = (
  availableRooms: number,
  requestedRooms: number,
): AvailabilityStatus => {
  if (availableRooms <= 0) return "sold-out";
  if (availableRooms < requestedRooms) return "insufficient";
  if (availableRooms <= SCARCE_THRESHOLD) return "scarce";
  return "available";
};
