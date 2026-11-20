import { queryOptions } from "@tanstack/react-query";
import { fetchHotelsByIds } from "@/shared/api/endpoints";
import { queryKeys } from "@/shared/api/query-keys";

/**
 * Hotéis das reservas do histórico (`GET /hotels?id=…`). Raiz própria fora da allowlist do persist
 * **e** `meta.sensitive`: as duas travas impedem que os ids das reservas cheguem ao `localStorage`.
 */
export const historyHotelsQueryOptions = (ids: readonly number[]) =>
  queryOptions({
    queryKey: queryKeys.historyHotels.byIds(ids),
    queryFn: ({ signal }) => fetchHotelsByIds(ids, signal),
    enabled: ids.length > 0,
    meta: { sensitive: true },
  });
