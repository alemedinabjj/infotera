import { cacheLife } from "next/cache";
import { fetchHotel, fetchHotelRooms } from "@/shared/api/endpoints";
import { isApiError } from "@/shared/api/http";
import type { Hotel, Room } from "@/shared/api/schemas";
import { fetchReviewsPage, type ReviewsPage } from "./reviews";
import { fetchSimilarHotels } from "./similar";

/**
 * Catálogo do hotel em funções `"use cache"` (F7c, Decisão 3): iguais para todo mundo e quase
 * imutáveis, então entram na casca estática da página e revalidam em segundo plano (ISR). Regras:
 * só sucesso ou `not-found` voltam daqui (erro é relançado e nunca é guardado) e a classificação 404
 * é feita **dentro** do escopo cacheado, onde o `ApiError` ainda é o mesmo objeto.
 */

export type HotelSnapshot = { kind: "found"; hotel: Hotel } | { kind: "not-found" };
export type FirstReviews = { page: ReviewsPage; fetchedAt: number };

/** `GET /hotels/:id`. 404 vira `not-found`; qualquer outra falha é relançada. Perfil `hours`. */
export const getHotelSnapshot = async (id: number): Promise<HotelSnapshot> => {
  "use cache";
  cacheLife("hours");
  try {
    return { kind: "found", hotel: await fetchHotel(id) };
  } catch (error) {
    if (isApiError(error) && error.isNotFound()) return { kind: "not-found" };
    throw error;
  }
};

/** `GET /rooms?hotelId=`. `available` é o campo volátil: perfil `minutes`. */
export const getHotelRoomsSnapshot = async (id: number): Promise<Room[]> => {
  "use cache";
  cacheLife("minutes");
  return fetchHotelRooms(id);
};

/**
 * 1ª página de comentários. `fetchedAt` é lido aqui dentro (permitido: "cache the value") e vira o
 * `initialDataUpdatedAt` do cliente, para o TanStack saber a idade real do snapshot.
 */
export const getFirstReviewsSnapshot = async (id: number): Promise<FirstReviews> => {
  "use cache";
  cacheLife("hours");
  const page = await fetchReviewsPage(id, 1);
  return { page, fetchedAt: Date.now() };
};

/** Até 4 hotéis do mesmo destino, melhor nota primeiro. Falha relançada: o `try/catch` é de quem chama. */
export const getSimilarHotelsSnapshot = async (
  destination: string,
  excludeId: number,
): Promise<Hotel[]> => {
  "use cache";
  cacheLife("hours");
  return fetchSimilarHotels(destination, excludeId);
};
