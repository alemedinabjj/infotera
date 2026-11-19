import type { QueryClient } from "@tanstack/react-query";
import { isApiError } from "@/shared/api/http";
import { hotelQueryOptions } from "@/shared/api/queries";
import type { Hotel } from "@/shared/api/schemas";
import { getServerQueryClient } from "@/shared/api/server-query-client";

export type LoadedHotel = { kind: "found"; hotel: Hotel } | { kind: "not-found" };

/**
 * Carrega o hotel no servidor pelo QueryClient do request (`React.cache`): `generateMetadata` e a
 * página compartilham **um** fetch, e o resultado vai para o cache do cliente na hidratação (a F5
 * lê sem request). 404 vira `not-found`; qualquer outro erro é relançado (cai no `error.tsx`).
 */
export const loadHotel = async (
  id: number,
  queryClient: QueryClient = getServerQueryClient(),
): Promise<LoadedHotel> => {
  try {
    return { kind: "found", hotel: await queryClient.fetchQuery(hotelQueryOptions(id)) };
  } catch (error) {
    if (isApiError(error) && error.isNotFound()) return { kind: "not-found" };
    throw error;
  }
};
