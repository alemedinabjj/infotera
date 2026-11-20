import { cacheLife } from "next/cache";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { makeHotel, makeReview, makeRoom } from "@/shared/testing/fixtures";
import {
  getFirstReviewsSnapshot,
  getHotelRoomsSnapshot,
  getHotelSnapshot,
  getSimilarHotelsSnapshot,
} from "./catalog.cached";

const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });

const stubFetch = (response: () => Response) => {
  const fetchMock = vi.fn(async (_url: string) => response());
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
};

beforeEach(() => vi.mocked(cacheLife).mockClear());
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("getHotelSnapshot", () => {
  it("devolve o hotel, chama GET /hotels/:id e usa o perfil hours", async () => {
    const fetchMock = stubFetch(() => json(makeHotel({ id: 7 })));
    const snapshot = await getHotelSnapshot(7);
    expect(snapshot.kind === "found" && snapshot.hotel.id).toBe(7);
    expect(fetchMock.mock.calls[0]?.[0]).toBe("http://api.test/hotels/7");
    expect(cacheLife).toHaveBeenCalledWith("hours");
  });

  it("404 vira not-found", async () => {
    stubFetch(() => json({ error: "Not Found" }, 404));
    expect(await getHotelSnapshot(999)).toEqual({ kind: "not-found" });
    // O 404 não pode ficar uma hora no cache: o menor perfil vence.
    expect(cacheLife).toHaveBeenLastCalledWith("minutes");
  });

  it("500 é relançado: erro nunca vai para o cache", async () => {
    stubFetch(() => json({ error: "Falha simulada" }, 500));
    await expect(getHotelSnapshot(1)).rejects.toMatchObject({ status: 500 });
  });
});

describe("getHotelRoomsSnapshot", () => {
  it("chama GET /rooms?hotelId= e usa o perfil minutes", async () => {
    const fetchMock = stubFetch(() => json([makeRoom({ id: 3, hotelId: 4 })]));
    const rooms = await getHotelRoomsSnapshot(4);
    expect(rooms.map((room) => room.id)).toEqual([3]);
    expect(fetchMock.mock.calls[0]?.[0]).toBe("http://api.test/rooms?hotelId=4");
    expect(cacheLife).toHaveBeenCalledWith("minutes");
  });

  it("relança falhas", async () => {
    stubFetch(() => json({ error: "x" }, 500));
    await expect(getHotelRoomsSnapshot(4)).rejects.toMatchObject({ status: 500 });
  });
});

describe("getFirstReviewsSnapshot", () => {
  it("pede a página 1 com 5 itens, devolve o total e carimba o fetchedAt", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-01T12:00:00Z"));
    const fetchMock = stubFetch(() =>
      json([makeReview({ id: 1 })], 200, { "X-Total-Count": "23" }),
    );
    const result = await getFirstReviewsSnapshot(18);
    expect(result.page.total).toBe(23);
    expect(result.page.items).toHaveLength(1);
    expect(result.fetchedAt).toBe(Date.parse("2026-06-01T12:00:00Z"));
    const url = new URL(fetchMock.mock.calls[0]?.[0] ?? "");
    expect(url.pathname).toBe("/reviews");
    expect(Object.fromEntries(url.searchParams)).toMatchObject({
      hotelId: "18",
      _page: "1",
      _limit: "5",
      _sort: "date,id",
      _order: "desc,desc",
    });
    expect(cacheLife).toHaveBeenCalledWith("hours");
  });
});

describe("getSimilarHotelsSnapshot", () => {
  it("filtra pelo destino exato, exclui o hotel e usa o perfil hours", async () => {
    const fetchMock = stubFetch(() => json([makeHotel({ id: 2 })]));
    const hotels = await getSimilarHotelsSnapshot("Rio de Janeiro, RJ", 1);
    expect(hotels.map((hotel) => hotel.id)).toEqual([2]);
    const url = new URL(fetchMock.mock.calls[0]?.[0] ?? "");
    expect(Object.fromEntries(url.searchParams)).toMatchObject({
      destination: "Rio de Janeiro, RJ",
      id_ne: "1",
      _limit: "4",
    });
    expect(cacheLife).toHaveBeenCalledWith("hours");
  });

  it("relança falhas (o try/catch fica fora do cache)", async () => {
    stubFetch(() => json({ error: "x" }, 500));
    await expect(getSimilarHotelsSnapshot("Rio", 1)).rejects.toMatchObject({ status: 500 });
  });
});
