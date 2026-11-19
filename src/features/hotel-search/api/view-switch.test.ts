import { InfiniteQueryObserver, QueryObserver } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import { makeHotel } from "@/shared/testing/fixtures";
import { makeTestQueryClient } from "@/shared/testing/render";
import { DEFAULT_FILTERS } from "../model/search-filters";
import { hotelsQueryOptions } from "./hotels";
import { hotelsInfiniteQueryOptions } from "./hotels-infinite";
import { seedViewSwitch } from "./view-switch";

const RIO = "Rio de Janeiro, RJ";
const ALL = Array.from({ length: 14 }, (_, index) => makeHotel({ id: index + 1 }));

const stubApi = () => {
  const fetchMock = vi.fn(async (input: string) => {
    const page = Number(new URL(input).searchParams.get("_page") ?? "0");
    const items = page === 0 ? ALL : ALL.slice((page - 1) * 10, page * 10);
    return new Response(JSON.stringify(items), {
      status: 200,
      headers: { "Content-Type": "application/json", "X-Total-Count": String(ALL.length) },
    });
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
};

afterEach(() => vi.unstubAllGlobals());

const fresh = { staleTime: 60_000 };

describe("seedViewSwitch", () => {
  it("páginas -> rolagem: a página 1 em cache vira o lote 1, sem request", async () => {
    const fetchMock = stubApi();
    const client = makeTestQueryClient();
    const first = await client.fetchQuery(hotelsQueryOptions(RIO, DEFAULT_FILTERS));
    const calls = fetchMock.mock.calls.length;

    seedViewSwitch(client, RIO, DEFAULT_FILTERS, "infinite");
    const feedFilters = { ...DEFAULT_FILTERS, view: "infinite" as const };
    const observer = new InfiniteQueryObserver(client, {
      ...hotelsInfiniteQueryOptions(RIO, feedFilters),
      ...fresh,
    });
    expect(observer.getCurrentResult().data).toEqual({ pages: [first], pageParams: [1] });
    expect(fetchMock.mock.calls.length).toBe(calls);
  });

  it("rolagem -> páginas: o 1º lote em cache vira a página 1, sem request", async () => {
    const fetchMock = stubApi();
    const client = makeTestQueryClient();
    const feed = await client.fetchInfiniteQuery({
      ...hotelsInfiniteQueryOptions(RIO, DEFAULT_FILTERS),
      pages: 1,
    });
    const calls = fetchMock.mock.calls.length;

    seedViewSwitch(client, RIO, DEFAULT_FILTERS, "pages");
    const observer = new QueryObserver(client, {
      ...hotelsQueryOptions(RIO, DEFAULT_FILTERS),
      ...fresh,
    });
    expect(observer.getCurrentResult().data).toEqual(feed.pages[0]);
    expect(fetchMock.mock.calls.length).toBe(calls);
  });

  it("não sobrescreve dado que o destino já tem (ex.: 14 hotéis do feed)", async () => {
    stubApi();
    const client = makeTestQueryClient();
    await client.fetchQuery(hotelsQueryOptions(RIO, DEFAULT_FILTERS));
    const feed = await client.fetchInfiniteQuery({
      ...hotelsInfiniteQueryOptions(RIO, DEFAULT_FILTERS),
      pages: 2,
    });
    seedViewSwitch(client, RIO, DEFAULT_FILTERS, "infinite");
    expect(client.getQueryData(hotelsInfiniteQueryOptions(RIO, DEFAULT_FILTERS).queryKey)).toEqual(
      feed,
    );
  });

  it("sem cache de origem não faz nada", () => {
    const client = makeTestQueryClient();
    seedViewSwitch(client, RIO, DEFAULT_FILTERS, "infinite");
    seedViewSwitch(client, RIO, DEFAULT_FILTERS, "pages");
    expect(client.getQueryCache().getAll()).toHaveLength(0);
  });
});
