import type { Room } from "@/shared/api/schemas";

export type FromPrice = { price: number; soldOut: boolean } | null;

/**
 * "A partir de" do detalhe, calculado pelos quartos: a menor diária entre os que têm estoque; se
 * todos estão esgotados, a menor de todas com `soldOut: true`; sem quartos, `null`. (O
 * `pricePerNight` do hotel diverge dos quartos nos hotéis 1 e 4.)
 */
export const lowestNightlyPrice = (rooms: readonly Room[]): FromPrice => {
  if (rooms.length === 0) return null;
  const available = rooms.filter((room) => room.available > 0);
  const pool = available.length > 0 ? available : rooms;
  return {
    price: Math.min(...pool.map((room) => room.pricePerNight)),
    soldOut: available.length === 0,
  };
};
