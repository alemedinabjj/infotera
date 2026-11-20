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

export type PhotoPrerenderParam = PrerenderParam & { photo: string };

/**
 * `generateStaticParams` de `/hotel/[hotelId]/photos/[photo]`: cada foto de cada hotel (`photo` é
 * 1-based, como na URL). Com todos os params conhecidos a página cheia da foto sai pronta no HTML do
 * build (h1 e foto sem depender de JavaScript); fotos fora da faixa seguem sob demanda e dão 404.
 */
export const toPhotoPrerenderParams = (
  hotels: readonly Pick<Hotel, "id" | "images">[],
): PhotoPrerenderParam[] => {
  const unique = [...new Map(hotels.map((hotel) => [hotel.id, hotel])).values()].sort(
    (a, b) => a.id - b.id,
  );
  const params = unique.flatMap((hotel) =>
    hotel.images.map((_, index) => ({ hotelId: String(hotel.id), photo: String(index + 1) })),
  );
  if (params.length === 0) throw new Error(hotelDetailsMessages.get("pt-BR").build.noHotels);
  return params;
};
