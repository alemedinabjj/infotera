import { queryOptions } from "@tanstack/react-query";
import { fetchRoomsOfHotels } from "@/shared/api/endpoints";
import { canonicalIds } from "@/shared/api/ids";
import { queryKeys } from "@/shared/api/query-keys";

/** `GET /rooms?hotelId=1&hotelId=4`: os quartos de todos os hotéis comparados num request só. */
export const comparisonRoomsQueryOptions = (hotelIds: readonly number[]) =>
  queryOptions({
    queryKey: queryKeys.rooms.byHotels(hotelIds),
    queryFn: ({ signal }) => fetchRoomsOfHotels(canonicalIds(hotelIds), signal),
    enabled: hotelIds.length > 0,
  });
