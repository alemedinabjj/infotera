import { afterEach, describe, expect, it, vi } from "vitest";
import { makeQueryClient } from "@/shared/api/query-client";
import { BOOKING_ID, makeBooking, makeHotel, makeRoom } from "@/shared/testing/fixtures";
import { makeTestQueryClient } from "@/shared/testing/render";
import { parseBookingId } from "../model/booking-id";
import { loadBooking, loadStayDetails } from "./confirmation.server";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

const id = (() => {
  const parsed = parseBookingId(BOOKING_ID);
  if (!parsed) throw new Error("id de teste inválido");
  return parsed;
})();

type Handler = () => Response | Promise<Response>;

/** `fetch` por método + path (sem a origem). Rota sem handler falha o teste. */
const stubRoutes = (routes: Record<string, Handler>) => {
  const calls: string[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      const path = new URL(url).pathname;
      const key = `${init?.method ?? "GET"} ${path}`;
      calls.push(key);
      const handler = routes[key];
      if (!handler) throw new Error(`rota não stubada: ${key}`);
      return handler();
    }),
  );
  return calls;
};

afterEach(() => vi.unstubAllGlobals());

describe("loadBooking", () => {
  it("devolve a reserva e chama GET /bookings/:id", async () => {
    const calls = stubRoutes({ [`GET /bookings/${BOOKING_ID}`]: () => json(makeBooking()) });
    const result = await loadBooking(id, makeTestQueryClient());
    expect(result.kind).toBe("found");
    expect(calls).toEqual([`GET /bookings/${BOOKING_ID}`]);
  });

  it("generateMetadata + página no mesmo request fazem um GET /bookings só", async () => {
    const calls = stubRoutes({ [`GET /bookings/${BOOKING_ID}`]: () => json(makeBooking()) });
    const queryClient = makeQueryClient();
    await Promise.all([loadBooking(id, queryClient), loadBooking(id, queryClient)]);
    await loadBooking(id, queryClient);
    expect(calls.filter((call) => call.startsWith("GET /bookings"))).toHaveLength(1);
  });

  it("404 vira not-found, sem log", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    stubRoutes({ [`GET /bookings/${BOOKING_ID}`]: () => json({}, 404) });
    expect(await loadBooking(id, makeTestQueryClient())).toEqual({ kind: "not-found" });
    expect(log).not.toHaveBeenCalled();
  });

  it("corpo fora do contrato vira unreadable e loga só o formato", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    stubRoutes({ [`GET /bookings/${BOOKING_ID}`]: () => json({ id: BOOKING_ID, hotelId: "x" }) });
    expect(await loadBooking(id, makeTestQueryClient())).toEqual({ kind: "unreadable" });
    expect(log).toHaveBeenCalledWith({
      event: "confirmation:load",
      resource: "booking",
      kind: "parse",
      status: 200,
    });
  });

  it.each([
    ["5xx", () => json({ error: "Falha simulada pela mock API" }, 500), "http", 500],
    [
      "rede",
      () => {
        throw new TypeError("fetch failed");
      },
      "network",
      null,
    ],
  ])(
    "%s é relançado e o log não leva id, nome nem a mensagem da API",
    async (_n, handler, kind, status) => {
      const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
      stubRoutes({ [`GET /bookings/${BOOKING_ID}`]: handler });
      await expect(loadBooking(id, makeTestQueryClient())).rejects.toMatchObject({ kind, status });
      expect(log).toHaveBeenCalledTimes(1);
      expect(log).toHaveBeenCalledWith({
        event: "confirmation:load",
        resource: "booking",
        kind,
        status,
      });
      expect(JSON.stringify(log.mock.calls)).not.toContain(BOOKING_ID);
      expect(JSON.stringify(log.mock.calls)).not.toContain("Falha simulada");
    },
  );
});

describe("loadStayDetails", () => {
  const booking = makeBooking({ hotelId: 3, roomId: 8 });

  it("hotel e quarto começam juntos: nenhum espera o outro", async () => {
    let releaseHotel: (response: Response) => void = () => undefined;
    let releaseRoom: (response: Response) => void = () => undefined;
    const calls = stubRoutes({
      "GET /hotels/3": () => new Promise<Response>((resolve) => (releaseHotel = resolve)),
      "GET /rooms/8": () => new Promise<Response>((resolve) => (releaseRoom = resolve)),
    });
    const pending = loadStayDetails(booking, makeTestQueryClient());
    await vi.waitFor(() => expect(calls).toEqual(["GET /hotels/3", "GET /rooms/8"]));
    releaseRoom(json(makeRoom({ id: 8, hotelId: 3 })));
    releaseHotel(json(makeHotel({ id: 3 })));
    const details = await pending;
    expect(details.hotel.status).toBe("ok");
    expect(details.room.status).toBe("ok");
  });

  it("404 vira missing (sem log) e 5xx vira error (com log sem PII)", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    stubRoutes({
      "GET /hotels/3": () => json({}, 404),
      "GET /rooms/8": () => json({ error: "Falha simulada" }, 500),
    });
    const details = await loadStayDetails(booking, makeTestQueryClient());
    expect(details).toEqual({ hotel: { status: "missing" }, room: { status: "error" } });
    expect(log).toHaveBeenCalledTimes(1);
    expect(log).toHaveBeenCalledWith({
      event: "confirmation:load",
      resource: "room",
      kind: "http",
      status: 500,
    });
  });

  it("rede e parse viram error, e a promessa nunca rejeita", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    stubRoutes({
      "GET /hotels/3": () => {
        throw new TypeError("fetch failed");
      },
      "GET /rooms/8": () => json({ id: 8 }),
    });
    await expect(loadStayDetails(booking, makeTestQueryClient())).resolves.toEqual({
      hotel: { status: "error" },
      room: { status: "error" },
    });
  });

  it("uma falha não derruba a outra", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    stubRoutes({
      "GET /hotels/3": () => json({ error: "x" }, 500),
      "GET /rooms/8": () => json(makeRoom({ id: 8, hotelId: 3 })),
    });
    const details = await loadStayDetails(booking, makeTestQueryClient());
    expect(details.hotel.status).toBe("error");
    expect(details.room.status).toBe("ok");
  });
});
