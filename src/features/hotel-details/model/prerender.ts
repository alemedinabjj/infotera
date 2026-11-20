import type { Hotel } from "@/shared/api/schemas";

export type PrerenderParam = { hotelId: string };

/**
 * `generateStaticParams` de `/hotel/[hotelId]`: ids únicos em ordem crescente. Com `cacheComponents`
 * a lista **precisa** ter ao menos um item, então vazio é erro (nunca `[]`).
 */
export const toPrerenderParams = (hotels: readonly Pick<Hotel, "id">[]): PrerenderParam[] => {
  const ids = [...new Set(hotels.map((hotel) => hotel.id))].sort((a, b) => a - b);
  if (ids.length === 0) {
    throw new Error("A API não listou nenhum hotel: não há o que pré-renderizar.");
  }
  return ids.map((id) => ({ hotelId: String(id) }));
};
