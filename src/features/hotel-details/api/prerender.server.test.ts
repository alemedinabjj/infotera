import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { listPrerenderHotelIds } from "./prerender.server";

const seed: { hotels: unknown[] } = JSON.parse(readFileSync("mock-api/db.seed.json", "utf8"));

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

const options = () => ({ sleep: vi.fn(async () => undefined), log: vi.fn() });

afterEach(() => vi.unstubAllGlobals());

describe("listPrerenderHotelIds", () => {
  it("transforma os 60 hotéis do seed em 60 params e pede a lista inteira, ordenada", async () => {
    const fetchMock = vi.fn(async (_url: string) => json(seed.hotels));
    vi.stubGlobal("fetch", fetchMock);
    const params = await listPrerenderHotelIds(options());
    expect(params).toHaveLength(60);
    expect(params[0]).toEqual({ hotelId: "1" });
    expect(params[59]).toEqual({ hotelId: "60" });
    expect(fetchMock.mock.calls[0]?.[0]).toBe("http://api.test/hotels?_sort=id&_order=asc");
  });

  it("absorve falhas transitórias (cold start) com retry e loga a tentativa", async () => {
    let calls = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        calls += 1;
        return calls < 3 ? json({ error: "acordando" }, 503) : json(seed.hotels);
      }),
    );
    const opts = options();
    await expect(listPrerenderHotelIds(opts)).resolves.toHaveLength(60);
    expect(calls).toBe(3);
    expect(opts.sleep.mock.calls).toEqual([[2000], [4000]]);
    expect(opts.log.mock.calls).toEqual([
      ["Aguardando a mock-api (tentativa 2/8)…"],
      ["Aguardando a mock-api (tentativa 3/8)…"],
    ]);
  });

  it("esgotadas as 8 tentativas falha com a mensagem em português e a URL da API", async () => {
    const fetchMock = vi.fn(async () => json({ error: "fora" }, 503));
    vi.stubGlobal("fetch", fetchMock);
    await expect(listPrerenderHotelIds(options())).rejects.toThrow(
      "Não foi possível listar os hotéis para o build: a mock-api em http://api.test não respondeu. Suba a API (cd mock-api && npm run server) ou confira NEXT_PUBLIC_API_URL.",
    );
    expect(fetchMock).toHaveBeenCalledTimes(8);
  });

  it("resposta vazia é erro (nunca []), sem retry", async () => {
    const fetchMock = vi.fn(async () => json([]));
    vi.stubGlobal("fetch", fetchMock);
    await expect(listPrerenderHotelIds(options())).rejects.toThrow(
      "A API não listou nenhum hotel: não há o que pré-renderizar.",
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
