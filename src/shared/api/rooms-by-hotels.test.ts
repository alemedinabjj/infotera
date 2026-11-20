import { QueryClient } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import { makeRoom } from "../testing/fixtures";
import { roomsByHotelsQueryOptions } from "./queries";

afterEach(() => vi.unstubAllGlobals());

describe("roomsByHotelsQueryOptions", () => {
  it("1 request com hotelId repetido, ordenado; chave canônica", async () => {
    const fetchMock = vi.fn(async (_url: string) => new Response(JSON.stringify([makeRoom()])));
    vi.stubGlobal("fetch", fetchMock);
    const options = roomsByHotelsQueryOptions([4, 1]);
    expect(options.queryKey).toEqual(["rooms", "by-hotels", [1, 4]]);
    await new QueryClient().fetchQuery(options);
    expect(String(fetchMock.mock.calls[0]?.[0])).toMatch(/\/rooms\?hotelId=1&hotelId=4$/);
  });

  it("sem ids fica desligada", () => {
    expect(roomsByHotelsQueryOptions([]).enabled).toBe(false);
  });
});
