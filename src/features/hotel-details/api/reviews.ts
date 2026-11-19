import { queryOptions } from "@tanstack/react-query";
import { apiGetPage } from "@/shared/api/http";
import { queryKeys } from "@/shared/api/query-keys";
import { type Review, reviewSchema } from "@/shared/api/schemas";

export const REVIEWS_PAGE_SIZE = 5;

export type ReviewsPage = { items: Review[]; total: number };

/**
 * `GET /reviews` do hotel, mais recentes primeiro (`id` desempata datas repetidas), 5 por página;
 * o total vem do `X-Total-Count`.
 */
export const fetchReviewsPage = (
  hotelId: number,
  page: number,
  signal?: AbortSignal,
): Promise<ReviewsPage> =>
  apiGetPage("/reviews", reviewSchema, {
    query: {
      hotelId,
      _sort: "date,id",
      _order: "desc,desc",
      _page: page,
      _limit: REVIEWS_PAGE_SIZE,
    },
    signal,
  });

/** Mesma chave no servidor (prefetch) e no cliente (`useSuspenseQuery`). */
export const reviewsQueryOptions = (hotelId: number, page: number) =>
  queryOptions({
    queryKey: queryKeys.reviews.byHotel(hotelId, page),
    queryFn: ({ signal }) => fetchReviewsPage(hotelId, page, signal),
  });
