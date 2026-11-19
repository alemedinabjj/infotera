import { afterEach, describe, expect, it, vi } from "vitest";
import { makeHotel } from "@/shared/testing/fixtures";
import { fetchSimilarHotels } from "./similar";

afterEach(() => vi.unstubAllGlobals());

describe("fetchSimilarHotels", () => {
  it("chama a URL exata: mesmo destino, sem o atual, melhor nota primeiro, até 4", async () => {
    const fetchMock = vi.fn(
      async (_url: string) =>
        new Response(JSON.stringify([makeHotel({ id: 17 })]), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const hotels = await fetchSimilarHotels("Rio de Janeiro, RJ", 1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "http://api.test/hotels?destination=Rio+de+Janeiro%2C+RJ&id_ne=1&_sort=rating%2CreviewCount&_order=desc%2Cdesc&_limit=4",
    );
    expect(hotels.map((hotel) => hotel.id)).toEqual([17]);
  });

  it("resposta fora do contrato é erro de parse", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify([{ id: "x" }]), { status: 200 })),
    );
    await expect(fetchSimilarHotels("Rio de Janeiro, RJ", 1)).rejects.toMatchObject({
      kind: "parse",
    });
  });
});
