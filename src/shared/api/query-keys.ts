import { canonicalIds } from "./ids";

type KeyParam = string | number | boolean | null | undefined | readonly (string | number)[];

/** Chaves centralizadas para evitar colisão e permitir prefetch com a mesma chave em outra feature. */
export const queryKeys = {
  suggestions: (q: string) => ["suggestions", q] as const,
  hotels: {
    all: ["hotels"] as const,
    list: (params: Readonly<Record<string, KeyParam>>) => ["hotels", "list", params] as const,
    /** Rolagem contínua: dado em formato `InfiniteData`, por isso não compartilha o prefixo de `list`. */
    infinite: (params: Readonly<Record<string, KeyParam>>) =>
      ["hotels", "infinite", params] as const,
    detail: (id: number) => ["hotels", "detail", id] as const,
    /** Ids deduplicados e ordenados: `[4, 1]` e `[1, 4]` compartilham cache. */
    byIds: (ids: readonly number[]) => ["hotels", "by-ids", canonicalIds(ids)] as const,
  },
  rooms: {
    byHotel: (hotelId: number) => ["rooms", "hotel", hotelId] as const,
    detail: (id: number) => ["rooms", "detail", id] as const,
    byHotels: (ids: readonly number[]) => ["rooms", "by-hotels", canonicalIds(ids)] as const,
  },
  reviews: {
    byHotel: (hotelId: number, page: number) => ["reviews", hotelId, page] as const,
  },
  /**
   * Hotéis das reservas do histórico: raiz **própria**, fora da allowlist do `persist` (os ids das
   * reservas de uma pessoa não vão para o `localStorage`). "Limpar histórico" remove esta raiz.
   */
  historyHotels: {
    all: ["history-hotels"] as const,
    byIds: (ids: readonly number[]) => ["history-hotels", canonicalIds(ids)] as const,
  },
  coupons: {
    detail: (code: string) => ["coupons", "detail", code] as const,
  },
  bookings: {
    all: ["bookings"] as const,
    detail: (id: number | string) => ["bookings", "detail", id] as const,
  },
};
