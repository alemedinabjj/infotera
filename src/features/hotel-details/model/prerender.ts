import type { Hotel } from "@/shared/api/schemas";
import { hotelDetailsMessages } from "../i18n/messages";

export type PrerenderParam = { hotelId: string };

/**
 * `generateStaticParams` de `/hotel/[hotelId]`: ids únicos em ordem crescente. Com `cacheComponents`
 * a lista **precisa** ter ao menos um item, então vazio é erro (nunca `[]`).
 */
export const toPrerenderParams = (hotels: readonly Pick<Hotel, "id">[]): PrerenderParam[] => {
  const ids = [...new Set(hotels.map((hotel) => hotel.id))].sort((a, b) => a - b);
  if (ids.length === 0) {
    throw new Error(hotelDetailsMessages.get("pt-BR").build.noHotels);
  }
  return ids.map((id) => ({ hotelId: String(id) }));
};
