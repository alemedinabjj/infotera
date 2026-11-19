type KeyParam = string | number | boolean | null | undefined | readonly (string | number)[];

/** Chaves centralizadas para evitar colisão e permitir prefetch com a mesma chave em outra feature. */
export const queryKeys = {
  suggestions: (q: string) => ["suggestions", q] as const,
  hotels: {
    all: ["hotels"] as const,
    list: (params: Readonly<Record<string, KeyParam>>) => ["hotels", "list", params] as const,
    detail: (id: number) => ["hotels", "detail", id] as const,
  },
  rooms: {
    byHotel: (hotelId: number) => ["rooms", "hotel", hotelId] as const,
    detail: (id: number) => ["rooms", "detail", id] as const,
  },
  reviews: {
    byHotel: (hotelId: number, page: number) => ["reviews", hotelId, page] as const,
  },
  coupons: {
    detail: (code: string) => ["coupons", "detail", code] as const,
  },
  bookings: {
    all: ["bookings"] as const,
    detail: (id: number | string) => ["bookings", "detail", id] as const,
  },
};
