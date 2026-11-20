import { QueryClient } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import { makeBooking, makeHotel } from "../testing/fixtures";
import { fetchHotelsByIds } from "./endpoints";
import { bookingQueryOptions, hotelsByIdsQueryOptions } from "./queries";
import { queryKeys } from "./query-keys";

const fetchMock = vi.fn<typeof fetch>();
const json = (body: unknown, init?: ResponseInit) =>
  new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json" },
    ...init,
  });

afterEach(() => {
  fetchMock.mockReset();
  vi.unstubAllGlobals();
});

describe("hotelsByIdsQueryOptions", () => {
  it("faz 1 request com id repetido e ordenado", async () => {
    fetchMock.mockResolvedValue(json([makeHotel({ id: 1 }), makeHotel({ id: 4 })]));
    vi.stubGlobal("fetch", fetchMock);
    const hotels = await new QueryClient().fetchQuery(hotelsByIdsQueryOptions([4, 1, 4]));
    expect(hotels).toHaveLength(2);
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(String(fetchMock.mock.calls[0]?.[0])).toMatch(/\/hotels\?id=1&id=4$/);
  });

  it("lista vazia nunca chama a API (devolveria todos os hotéis)", async () => {
    vi.stubGlobal("fetch", fetchMock);
    const options = hotelsByIdsQueryOptions([]);
    expect(options.enabled).toBe(false);
    expect(await fetchHotelsByIds([])).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("a chave é canônica: [4, 1] e [1, 4] compartilham cache", () => {
    expect(queryKeys.hotels.byIds([4, 1])).toEqual(["hotels", "by-ids", [1, 4]]);
    expect(queryKeys.hotels.byIds([4, 1])).toEqual(queryKeys.hotels.byIds([1, 4, 1]));
    expect(queryKeys.rooms.byHotels([7, 1])).toEqual(["rooms", "by-hotels", [1, 7]]);
  });

  it("erro 500 vira falha da query (ApiError)", async () => {
    fetchMock.mockResolvedValue(json({ error: "x" }, { status: 500 }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(new QueryClient().fetchQuery(hotelsByIdsQueryOptions([1]))).rejects.toMatchObject({
      status: 500,
    });
  });
});

describe("bookingQueryOptions", () => {
  it("marca a query como sensível (PII fora do cache persistido)", () => {
    expect(bookingQueryOptions("abc-123").meta).toEqual({ sensitive: true });
    expect(bookingQueryOptions("abc-123").queryKey).toEqual(queryKeys.bookings.detail("abc-123"));
  });

  it("lê a reserva pelo id", async () => {
    fetchMock.mockResolvedValue(json(makeBooking()));
    vi.stubGlobal("fetch", fetchMock);
    const booking = await new QueryClient().fetchQuery(bookingQueryOptions("abc-123"));
    expect(booking.hotelId).toBeTypeOf("number");
  });
});
