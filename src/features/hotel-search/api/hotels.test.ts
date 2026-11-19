import { QueryObserver } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import { makeHotel, makeRoom } from "@/shared/testing/fixtures";
import { makeTestQueryClient } from "@/shared/testing/render";
import { DEFAULT_FILTERS } from "../model/search-filters";
import { toHotelsApiQuery, toHotelsRequest } from "../model/to-api-query";
import {
  fetchHotels,
  fetchHotelsPage,
  hotelsQueryOptions,
  keepPreviousIfSameDestination,
} from "./hotels";

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
    const previous = { items: [makeHotel()], total: 1, center: null };
    expect(
      keep(previous, { queryKey: ["hotels", "list", { destination: "Rio de Janeiro, RJ" }] }),
    ).toBeUndefined();
    expect(keep(previous, undefined)).toBeUndefined();
    expect(keep(previous, { queryKey: ["hotels", "list"] })).toBeUndefined();
  });
});

/** Três hotéis em linha: o centroide é o do meio; as distâncias são 0,0 / 1,0 / 2,0 graus. */
const LINE = [
  makeHotel({ id: 1, latitude: 0, longitude: 2 }),
  makeHotel({ id: 2, latitude: 0, longitude: 0 }),
  makeHotel({ id: 3, latitude: 0, longitude: 1 }),
];

type Route = (url: URL) => Response;

const stubRoutes = (route: Route) => {
  const fetchMock = vi.fn(async (input: string) => route(new URL(input)));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
};

const json = (items: unknown, total?: number): Response =>
  new Response(JSON.stringify(items), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      ...(total === undefined ? {} : { "X-Total-Count": String(total) }),
    },
  });

const hotelCalls = (fetchMock: ReturnType<typeof stubRoutes>) =>
  fetchMock.mock.calls.filter(([input]) => new URL(input).pathname === "/hotels");

const ids = (page: { items: { id: number }[] }) => page.items.map((hotel) => hotel.id);

describe("fetchHotelsPage: sort=distance", () => {
  const filters = { ...DEFAULT_FILTERS, sort: "distance" as const };

  it("ordena e fatia no cliente, sem _sort/_page/_limit, e a página 2 não faz request", async () => {
    const fetchMock = stubRoutes(() => json(LINE));
    const client = makeTestQueryClient();
    const first = await client.fetchQuery(hotelsQueryOptions(RIO, filters));
    // centro (0, 1): hotel 3 a 0 km, hotels 1 e 2 empatados (1 grau) -> por id.
    expect(ids(first)).toEqual([3, 1, 2]);
    expect(first.total).toBe(3);
    expect(first.center).toEqual({ latitude: 0, longitude: 1 });
    // Sem filtros as duas buscas têm a mesma chave: um request só (mais o dos quartos).
    expect(hotelCalls(fetchMock)).toHaveLength(1);
    const url = new URL(String(fetchMock.mock.calls[0]?.[0]));
    expect([...url.searchParams.keys()]).toEqual(["destination"]);

    const second = await client.fetchQuery(hotelsQueryOptions(RIO, { ...filters, page: 2 }));
    expect(second.items).toEqual([]);
    expect(second.total).toBe(3);
    expect(hotelCalls(fetchMock)).toHaveLength(1);
  });

  it("com filtro: a lista filtrada e o centro do destino inteiro (2 requests)", async () => {
    const fetchMock = stubRoutes((url) =>
      json(url.searchParams.has("rating_gte") ? [LINE[0]] : LINE),
    );
    const client = makeTestQueryClient();
    const page = await client.fetchQuery(hotelsQueryOptions(RIO, { ...filters, minRating: 4 }));
    expect(ids(page)).toEqual([1]);
    expect(page.center).toEqual({ latitude: 0, longitude: 1 });
    expect(hotelCalls(fetchMock)).toHaveLength(2);
  });

  it("falha do centroide derruba a página", async () => {
    stubRoutes(() => new Response("{}", { status: 500 }));
    await expect(
      makeTestQueryClient().fetchQuery(hotelsQueryOptions(RIO, filters)),
    ).rejects.toMatchObject({ status: 500 });
  });
});

describe("fetchHotelsPage: quartos da página", () => {
  const room = (id: number, hotelId: number, pricePerNight: number) =>
    makeRoom({ id, hotelId, pricePerNight });

  it("um único GET /rooms com hotelId repetido, semeado no cache de cada hotel", async () => {
    const fetchMock = stubRoutes((url) =>
      url.pathname === "/rooms"
        ? json([room(1, 1, 1200), room(2, 1, 800), room(6, 3, 890)])
        : json([LINE[0], LINE[2]], 2),
    );
    const client = makeTestQueryClient();
    await client.fetchQuery(hotelsQueryOptions(RIO, DEFAULT_FILTERS));
    const roomCalls = fetchMock.mock.calls
      .map(([input]) => new URL(input))
      .filter((url) => url.pathname === "/rooms");
    expect(roomCalls).toHaveLength(1);
    expect(roomCalls[0]?.searchParams.getAll("hotelId")).toEqual(["1", "3"]);
    expect(client.getQueryData(["rooms", "hotel", 1])).toHaveLength(2);
    expect(client.getQueryData(["rooms", "hotel", 3])).toHaveLength(1);
  });

  it("falha dos quartos não derruba a lista (o card usa o preço do hotel)", async () => {
    stubRoutes((url) =>
      url.pathname === "/rooms" ? new Response("{}", { status: 500 }) : json([LINE[0]], 1),
    );
    const client = makeTestQueryClient();
    const page = await client.fetchQuery(hotelsQueryOptions(RIO, DEFAULT_FILTERS));
    expect(ids(page)).toEqual([1]);
    expect(client.getQueryData(["rooms", "hotel", 1])).toBeUndefined();
  });
});

describe("fetchHotelsPage: ordenação de API", () => {
  const request = toHotelsRequest(RIO, DEFAULT_FILTERS);

  it("traz a lista da API e o centroide do destino", async () => {
    stubRoutes((url) => (url.searchParams.has("_page") ? json([LINE[2]], 3) : json(LINE)));
    const page = await fetchHotelsPage(request, { client: makeTestQueryClient() });
    expect(ids(page)).toEqual([3]);
    expect(page.total).toBe(3);
    expect(page.center).toEqual({ latitude: 0, longitude: 1 });
  });

  it("falha do centroide não derruba a lista: só some a distância", async () => {
    stubRoutes((url) =>
      url.searchParams.has("_page") ? json([LINE[2]], 3) : new Response("{}", { status: 500 }),
    );
    const page = await fetchHotelsPage(request, { client: makeTestQueryClient() });
    expect(ids(page)).toEqual([3]);
    expect(page.center).toBeNull();
  });
});

describe("fetchHotelsPage: retry só na query externa", () => {
  const withRetry = (filters: typeof DEFAULT_FILTERS) => ({
    ...hotelsQueryOptions(RIO, filters),
    retry: 2,
    retryDelay: 0,
  });
  const failing = () => stubRoutes(() => new Response("{}", { status: 500 }));

  it("distance sem filtros: 3 requests (1 por tentativa), não 9", async () => {
    const fetchMock = failing();
    await expect(
      makeTestQueryClient().fetchQuery(withRetry({ ...DEFAULT_FILTERS, sort: "distance" })),
    ).rejects.toMatchObject({ status: 500 });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("distance com filtro: lista + centroide por tentativa (6), não 18", async () => {
    const fetchMock = failing();
    await expect(
      makeTestQueryClient().fetchQuery(
        withRetry({ ...DEFAULT_FILTERS, sort: "distance", minRating: 4 }),
      ),
    ).rejects.toMatchObject({ status: 500 });
    expect(fetchMock).toHaveBeenCalledTimes(6);
  });

  it("ordenação de API: a lista com retry (3) e o centroide sem retry (1)", async () => {
    const fetchMock = failing();
    await expect(
      makeTestQueryClient().fetchQuery(withRetry(DEFAULT_FILTERS)),
    ).rejects.toMatchObject({ status: 500 });
    // 3 tentativas da lista + o centroide (sem retry interno) em cada uma.
    expect(fetchMock).toHaveBeenCalledTimes(6);
  });
});

describe("keepPreviousIfSameDestination é genérico", () => {
  it("serve a qualquer formato de dado", () => {
    const keep = keepPreviousIfSameDestination(RIO);
    expect(keep(["x"], { queryKey: ["hotels", "infinite", { destination: RIO }] })).toEqual(["x"]);
    expect(keep(["x"], { queryKey: ["hotels", "infinite", { destination: "Y" }] })).toBeUndefined();
  });
});
