import { z } from "zod";
import { apiGet } from "@/shared/api/http";
import { type Hotel, hotelSchema } from "@/shared/api/schemas";

export const SIMILAR_HOTELS_LIMIT = 4;

const hotelsSchema = z.array(hotelSchema);

/** Hotéis do mesmo destino (sem o atual), melhor nota primeiro, até 4. */
export const fetchSimilarHotels = (
  destination: string,
  excludeId: number,
  signal?: AbortSignal,
): Promise<Hotel[]> =>
  apiGet("/hotels", hotelsSchema, {
    query: {
      destination,
      id_ne: excludeId,
      _sort: "rating,reviewCount",
      _order: "desc,desc",
      _limit: SIMILAR_HOTELS_LIMIT,
    },
    signal,
  });
