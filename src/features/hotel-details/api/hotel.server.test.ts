import { afterEach, describe, expect, it, vi } from "vitest";
import { makeQueryClient } from "@/shared/api/query-client";
import { makeHotel } from "@/shared/testing/fixtures";
import { makeTestQueryClient } from "@/shared/testing/render";
import { loadHotel } from "./hotel.server";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

afterEach(() => vi.unstubAllGlobals());

describe("loadHotel", () => {
  it("devolve o hotel e chama GET /hotels/:id", async () => {
    const fetchMock = vi.fn(async (_url: string) => json(makeHotel({ id: 7 })));
    vi.stubGlobal("fetch", fetchMock);
    const result = await loadHotel(7, makeTestQueryClient());
    expect(result.kind).toBe("found");
    expect(result.kind === "found" && result.hotel.id).toBe(7);
    expect(fetchMock.mock.calls[0]?.[0]).toBe("http://api.test/hotels/7");
  });

  it("generateMetadata e a página no mesmo request fazem um fetch só", async () => {
    const fetchMock = vi.fn(async (_url: string) => json(makeHotel()));
    vi.stubGlobal("fetch", fetchMock);
    const queryClient = makeQueryClient();
    await Promise.all([loadHotel(1, queryClient), loadHotel(1, queryClient)]);
    await loadHotel(1, queryClient);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("404 vira not-found", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => json({ error: "Not Found" }, 404)),
    );
    expect(await loadHotel(999, makeTestQueryClient())).toEqual({ kind: "not-found" });
  });

  it("outros erros são relançados (a rota cai no error.tsx)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => json({ error: "Falha simulada" }, 500)),
    );
    await expect(loadHotel(1, makeTestQueryClient())).rejects.toMatchObject({
      kind: "http",
      status: 500,
    });
  });

  it("falha de rede também é relançada", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("fetch failed");
      }),
    );
    await expect(loadHotel(1, makeTestQueryClient())).rejects.toMatchObject({ kind: "network" });
  });
});
