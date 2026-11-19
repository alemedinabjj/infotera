import { InfiniteQueryObserver, QueryObserver } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import { makeHotel } from "@/shared/testing/fixtures";
import { makeTestQueryClient } from "@/shared/testing/render";
import { DEFAULT_FILTERS } from "../model/search-filters";
import { hotelsQueryOptions } from "./hotels";
import { hotelsInfiniteQueryOptions, nextFeedPage } from "./hotels-infinite";

const RIO = "Rio de Janeiro, RJ";
const ALL = Array.from({ length: 14 }, (_, index) =>
  makeHotel({ id: index + 1, latitude: -22.9, longitude: -43.2 + index * 0.01 }),
);

const stubApi = () => {
  const fetchMock = vi.fn(async (input: string) => {
    const url = new URL(input);
    const page = Number(url.searchParams.get("_page") ?? "0");
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

const page = (count: number, total: number) => ({
  items: ALL.slice(0, count),
  total,
  center: null,
});

describe("nextFeedPage", () => {
  it("10 de 14 carregados pede o lote 2; 14 de 14 termina", () => {
    expect(nextFeedPage([page(10, 14)])).toBe(2);
    expect(nextFeedPage([page(10, 14), page(4, 14)])).toBeUndefined();
  });

  it("um lote só com tudo carregado e lista vazia não têm próximo", () => {
    expect(nextFeedPage([page(3, 3)])).toBeUndefined();
    expect(nextFeedPage([])).toBeUndefined();
  });
});

describe("hotelsInfiniteQueryOptions", () => {
  it("carrega o lote 1 e o 2 pela mesma busca de página, e acaba no total", async () => {
    const fetchMock = stubApi();
    const client = makeTestQueryClient();
    const observer = new InfiniteQueryObserver(
      client,
      hotelsInfiniteQueryOptions(RIO, DEFAULT_FILTERS, client),
    );
    const unsubscribe = observer.subscribe(() => undefined);
    await vi.waitFor(() => expect(observer.getCurrentResult().data?.pages).toHaveLength(1));
    expect(observer.getCurrentResult().hasNextPage).toBe(true);
    await observer.fetchNextPage();
    const result = observer.getCurrentResult();
    expect(result.data?.pages.map((item) => item.items.length)).toEqual([10, 4]);
    expect(result.hasNextPage).toBe(false);
    const pages = fetchMock.mock.calls.map(([input]) => new URL(input).searchParams.get("_page"));
    expect(pages).toContain("1");
    expect(pages).toContain("2");
    unsubscribe();
  });

  it("sort=distance: o lote 2 sai do cache da lista inteira, sem request novo", async () => {
    const fetchMock = stubApi();
    const client = makeTestQueryClient();
    const filters = { ...DEFAULT_FILTERS, sort: "distance" as const, view: "infinite" as const };
    const observer = new InfiniteQueryObserver(
      client,
      hotelsInfiniteQueryOptions(RIO, filters, client),
    );
    const unsubscribe = observer.subscribe(() => undefined);
    await vi.waitFor(() => expect(observer.getCurrentResult().data?.pages).toHaveLength(1));
    await observer.fetchNextPage();
    expect(observer.getCurrentResult().data?.pages.map((item) => item.items.length)).toEqual([
      10, 4,
    ]);
    expect(fetchMock).toHaveBeenCalledOnce();
    unsubscribe();
  });

  it("initialData: a página 1 em cache vira o lote 1 (sem request)", async () => {
    const fetchMock = stubApi();
    const client = makeTestQueryClient();
    const first = await client.fetchQuery(hotelsQueryOptions(RIO, DEFAULT_FILTERS, client));
    const calls = fetchMock.mock.calls.length;
    const options = hotelsInfiniteQueryOptions(RIO, DEFAULT_FILTERS, client);
    const observer = new InfiniteQueryObserver(client, {
      ...options,
      staleTime: 60_000,
    });
    expect(observer.getCurrentResult().data?.pages).toEqual([first]);
    expect(observer.getCurrentResult().data?.pageParams).toEqual([1]);
    expect(fetchMock.mock.calls.length).toBe(calls);
  });

  it("initialData: o 1º lote do feed em cache vira a página 1", async () => {
    const fetchMock = stubApi();
    const client = makeTestQueryClient();
    const feed = await client.fetchInfiniteQuery({
      ...hotelsInfiniteQueryOptions(RIO, DEFAULT_FILTERS, client),
      pages: 1,
    });
    const calls = fetchMock.mock.calls.length;
    const options = hotelsQueryOptions(RIO, DEFAULT_FILTERS, client);
    const data = client.getQueryData(options.queryKey);
    expect(data).toBeUndefined();
    const observer = new QueryObserver(client, {
      ...options,
      staleTime: 60_000,
    });
    expect(observer.getCurrentResult().data).toEqual(feed.pages[0]);
    expect(fetchMock.mock.calls.length).toBe(calls);
  });
});
