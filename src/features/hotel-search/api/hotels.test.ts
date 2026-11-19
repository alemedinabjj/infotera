import { QueryObserver } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import { makeHotel } from "@/shared/testing/fixtures";
import { makeTestQueryClient } from "@/shared/testing/render";
import { DEFAULT_FILTERS } from "../model/search-filters";
import { toHotelsApiQuery } from "../model/to-api-query";
import { fetchHotels, hotelsQueryOptions, keepPreviousIfSameDestination } from "./hotels";

const stubFetch = (total: string | null = "14") => {
  const fetchMock = vi.fn(async (_url: string) => {
    const headers = new Headers({ "Content-Type": "application/json" });
    if (total !== null) headers.set("X-Total-Count", total);
    return new Response(JSON.stringify([makeHotel()]), { status: 200, headers });
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
};

const RIO = "Rio de Janeiro, RJ";

const stubPending = () =>
  vi.stubGlobal(
    "fetch",
    vi.fn(() => new Promise<Response>(() => undefined)),
  );

afterEach(() => vi.unstubAllGlobals());

describe("fetchHotels", () => {
  it("chama a URL exata e devolve itens + total do header", async () => {
    const fetchMock = stubFetch("14");
    const result = await fetchHotels(
      toHotelsApiQuery(
        "Rio de Janeiro, RJ",
        { ...DEFAULT_FILTERS, types: ["hotel", "pousada"] },
        "popular",
      ),
    );
    expect(fetchMock).toHaveBeenCalledOnce();
    const firstCall: unknown[] = fetchMock.mock.calls[0] ?? [];
    expect(firstCall[0]).toBe(
      "http://api.test/hotels?destination=Rio+de+Janeiro%2C+RJ&propertyType=hotel&propertyType=pousada&_sort=reviewCount%2Cid&_order=desc%2Casc&_page=1&_limit=10",
    );
    expect(result.total).toBe(14);
    expect(result.items).toHaveLength(1);
  });

  it("sem header cai para a quantidade de itens", async () => {
    stubFetch(null);
    expect((await fetchHotels(toHotelsApiQuery("X", DEFAULT_FILTERS, "popular"))).total).toBe(1);
  });

  it("resposta fora do contrato vira erro de parse", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify([{ id: "x" }]))),
    );
    await expect(
      fetchHotels(toHotelsApiQuery("X", DEFAULT_FILTERS, "popular")),
    ).rejects.toMatchObject({
      kind: "parse",
    });
  });
});

describe("hotelsQueryOptions", () => {
  it("a chave é a query da API (filtros equivalentes compartilham cache)", () => {
    const a = hotelsQueryOptions("Rio de Janeiro, RJ", {
      ...DEFAULT_FILTERS,
      types: ["resort", "hotel"],
    });
    const b = hotelsQueryOptions("Rio de Janeiro, RJ", {
      ...DEFAULT_FILTERS,
      types: ["hotel", "resort"],
    });
    expect(a.queryKey).toEqual(b.queryKey);
    expect(a.queryKey[2]).toEqual(
      toHotelsApiQuery(
        "Rio de Janeiro, RJ",
        { ...DEFAULT_FILTERS, types: ["hotel", "resort"] },
        "popular",
      ),
    );
  });

  it("busca pelo query client", async () => {
    stubFetch("3");
    const client = makeTestQueryClient();
    const data = await client.fetchQuery(hotelsQueryOptions("Rio de Janeiro, RJ", DEFAULT_FILTERS));
    expect(data.total).toBe(3);
  });

  it("placeholder: troca de filtro no mesmo destino mantém a lista anterior enquanto busca", async () => {
    const client = makeTestQueryClient();
    stubFetch("3");
    const observer = new QueryObserver(client, hotelsQueryOptions(RIO, DEFAULT_FILTERS));
    const unsubscribe = observer.subscribe(() => undefined);
    await vi.waitFor(() => expect(observer.getCurrentResult().data?.total).toBe(3));
    stubPending();
    observer.setOptions(hotelsQueryOptions(RIO, { ...DEFAULT_FILTERS, minRating: 4 }));
    expect(observer.getCurrentResult()).toMatchObject({ isPlaceholderData: true });
    expect(observer.getCurrentResult().data?.total).toBe(3);
    unsubscribe();
  });

  it("placeholder: outro destino mostra loading, não a lista antiga", async () => {
    const client = makeTestQueryClient();
    stubFetch("3");
    const observer = new QueryObserver(client, hotelsQueryOptions(RIO, DEFAULT_FILTERS));
    const unsubscribe = observer.subscribe(() => undefined);
    await vi.waitFor(() => expect(observer.getCurrentResult().data?.total).toBe(3));
    stubPending();
    observer.setOptions(hotelsQueryOptions("Gramado, RS", DEFAULT_FILTERS));
    expect(observer.getCurrentResult()).toMatchObject({
      isPlaceholderData: false,
      data: undefined,
    });
    unsubscribe();
  });

  it("placeholder: outro destino não herda a lista", () => {
    const keep = keepPreviousIfSameDestination("Gramado, RS");
    const previous = { items: [makeHotel()], total: 1 };
    expect(
      keep(previous, { queryKey: ["hotels", "list", { destination: "Rio de Janeiro, RJ" }] }),
    ).toBeUndefined();
    expect(keep(previous, undefined)).toBeUndefined();
    expect(keep(previous, { queryKey: ["hotels", "list"] })).toBeUndefined();
  });
});
