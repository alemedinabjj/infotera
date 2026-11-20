import { readFileSync } from "node:fs";
import { join } from "node:path";
import { dehydrate, QueryClient } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import { reviewsQueryOptions } from "@/features/hotel-details/api/reviews";
import { hotelsQueryOptions } from "@/features/hotel-search/api/hotels";
import { hotelsInfiniteQueryOptions } from "@/features/hotel-search/api/hotels-infinite";
import { DEFAULT_FILTERS } from "@/features/hotel-search/model/search-filters";
import { fetchSuggestions } from "@/features/search-form/api/suggestions";
import {
  deserializeClient,
  serializeClient,
  shouldDehydratePublicQuery,
} from "@/shared/api/persist";
import {
  hotelQueryOptions,
  hotelRoomsQueryOptions,
  hotelsByIdsQueryOptions,
  roomQueryOptions,
  roomsByHotelsQueryOptions,
} from "@/shared/api/queries";
import { queryKeys } from "@/shared/api/query-keys";
import { z } from "@/shared/lib/zod";

/**
 * Cada `queryKey` persistível, preenchida pelo `queryFn` REAL contra uma API de fixture (o seed da
 * mock-api): o schema de `persist.ts` precisa aceitar o formato que o app realmente grava, senão o
 * cache offline é descartado em silêncio.
 */
const seed = z
  .object({
    suggestions: z.array(z.record(z.string(), z.unknown())),
    hotels: z.array(z.record(z.string(), z.unknown())),
    rooms: z.array(z.record(z.string(), z.unknown())),
    reviews: z.array(z.record(z.string(), z.unknown())),
  })
  .parse(JSON.parse(readFileSync(join(process.cwd(), "mock-api/db.seed.json"), "utf-8")));

const json = (items: unknown[], total = items.length): Response =>
  new Response(JSON.stringify(items), { headers: { "X-Total-Count": String(total) } });

const matching = (rows: Record<string, unknown>[], params: URLSearchParams, field: string) => {
  const wanted = params.getAll(field);
  return wanted.length === 0 ? rows : rows.filter((row) => wanted.includes(String(row[field])));
};

const page = (rows: unknown[], params: URLSearchParams): Response => {
  const limit = Number(params.get("_limit") ?? rows.length);
  const start = (Number(params.get("_page") ?? 1) - 1) * limit;
  return json(rows.slice(start, start + limit), rows.length);
};

const fakeApi = async (input: string): Promise<Response> => {
  const url = new URL(input);
  const params = url.searchParams;
  const single = /^\/(hotels|rooms)\/(\d+)$/.exec(url.pathname);
  if (single) {
    const rows = single[1] === "hotels" ? seed.hotels : seed.rooms;
    return new Response(JSON.stringify(rows.find((row) => String(row.id) === single[2])));
  }
  switch (url.pathname) {
    case "/suggestions":
      return json(seed.suggestions.filter((item) => String(item.searchName).includes("rio")));
    case "/hotels":
      return page(matching(seed.hotels, params, "id"), params);
    case "/rooms":
      return json(matching(seed.rooms, params, "hotelId"));
    case "/reviews":
      return page(matching(seed.reviews, params, "hotelId"), params);
    default:
      return new Response("{}", { status: 404 });
  }
};

afterEach(() => vi.unstubAllGlobals());

const fillClient = async (): Promise<QueryClient> => {
  vi.stubGlobal("fetch", vi.fn(fakeApi));
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  await client.fetchQuery({
    queryKey: queryKeys.suggestions("rio"),
    queryFn: () => fetchSuggestions("rio"),
  });
  await client.fetchQuery(hotelQueryOptions(1));
  await client.fetchQuery(hotelsByIdsQueryOptions([1, 2]));
  await client.fetchQuery(hotelRoomsQueryOptions(1));
  await client.fetchQuery(roomQueryOptions(1));
  await client.fetchQuery(roomsByHotelsQueryOptions([1, 2]));
  await client.fetchQuery(reviewsQueryOptions(1, 1));
  await client.fetchQuery(hotelsQueryOptions("", DEFAULT_FILTERS));
  await client.fetchInfiniteQuery(hotelsInfiniteQueryOptions("", DEFAULT_FILTERS));
  return client;
};

describe("formatos reais de cada consulta pública sobrevivem ao ciclo salvar e restaurar", () => {
  it("nenhuma consulta é descartada pela validação por raiz", async () => {
    const client = await fillClient();
    const saved = serializeClient({
      buster: "v1",
      timestamp: Date.now(),
      clientState: dehydrate(client, { shouldDehydrateQuery: shouldDehydratePublicQuery }),
    });
    const restored = deserializeClient(saved).clientState.queries.map((query) => query.queryKey);
    const written = dehydrate(client, { shouldDehydrateQuery: shouldDehydratePublicQuery }).queries;
    expect(written.length).toBeGreaterThanOrEqual(9);
    expect(restored).toEqual(written.map((query) => query.queryKey));
  });
});
