import { afterEach, describe, expect, it, vi } from "vitest";
import { makeReview } from "@/shared/testing/fixtures";
import { fetchReviewsPage, REVIEWS_PAGE_SIZE, reviewsQueryOptions } from "./reviews";

const stubFetch = (total: string | null = "14") => {
  const fetchMock = vi.fn(async (_url: string) => {
    const headers = new Headers({ "Content-Type": "application/json" });
    if (total !== null) headers.set("X-Total-Count", total);
    return new Response(JSON.stringify([makeReview()]), { status: 200, headers });
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
};

afterEach(() => vi.unstubAllGlobals());

describe("fetchReviewsPage", () => {
  it("chama a URL exata (mais recentes primeiro, desempate por id, 5 por página)", async () => {
    const fetchMock = stubFetch();
    const result = await fetchReviewsPage(45, 3);
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "http://api.test/reviews?hotelId=45&_sort=date%2Cid&_order=desc%2Cdesc&_page=3&_limit=5",
    );
    expect(REVIEWS_PAGE_SIZE).toBe(5);
    expect(result.total).toBe(14);
    expect(result.items).toHaveLength(1);
  });

  it("sem X-Total-Count o total é o tamanho da página", async () => {
    stubFetch(null);
    expect((await fetchReviewsPage(1, 1)).total).toBe(1);
  });

  it("a chave tem hotel e página", () => {
    expect(reviewsQueryOptions(45, 2).queryKey).toEqual(["reviews", 45, 2]);
    expect(reviewsQueryOptions(45, 3).queryKey).not.toEqual(reviewsQueryOptions(45, 2).queryKey);
  });
});
