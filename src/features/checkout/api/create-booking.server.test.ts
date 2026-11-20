import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { makeHotel, makeRoom, makeSearchCriteria } from "@/shared/testing/fixtures";
import { type BookingRequest, toBookingRequest } from "../model/booking-request";
import { defaultCheckoutValues } from "../model/checkout.schema";
import { calculatePrice } from "../model/price";
import { toBookingInput } from "../model/to-booking-input";
import { createBooking } from "./create-booking.server";

const API = "http://api.test";
const NOW = new Date("2026-11-19T15:04:05.000Z");
const ID = "8b0e4d2a-6f3c-4a1b-9c7d-2e5f8a1b3c4d";
const criteria = makeSearchCriteria({ checkIn: "2026-12-20", checkOut: "2026-12-23" });
const quote = calculatePrice({ pricePerNight: 1200, nights: 3, rooms: 1 });
const request: BookingRequest = toBookingRequest(
  {
    ...defaultCheckoutValues,
    contact: {
      firstName: "Ana",
      lastName: "Souza",
      email: "ana@exemplo.com",
      phoneCountry: "BR",
      phone: "(11) 98765-4321",
    },
    companions: [{ kind: "adult", firstName: "Bruno", lastName: "Souza", age: "" }],
    payment: { ...defaultCheckoutValues.payment, cardNumber: "4111 1111 1111 1111" },
  },
  { hotelId: 1, roomId: 1, criteria },
  quote,
  ID,
);

const stored = toBookingInput(request, quote, NOW);

type Handler = (init: RequestInit | undefined) => Response | Promise<Response>;
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

const stubFetch = (routes: Record<string, Handler>) => {
  const calls: { method: string; url: string; body: unknown }[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      const method = init?.method ?? "GET";
      const path = url.replace(API, "");
      calls.push({
        method,
        url: path,
        body: typeof init?.body === "string" ? JSON.parse(init.body) : undefined,
      });
      const handler = routes[`${method} ${path}`];
      if (!handler) throw new Error(`rota não prevista: ${method} ${path}`);
      return handler(init);
    }),
  );
  return calls;
};

const okRoutes: Record<string, Handler> = {
  "GET /hotels/1": () => json(makeHotel()),
  "GET /rooms/1": () => json(makeRoom()),
};

let errorSpy: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
});
afterEach(() => vi.unstubAllGlobals());

describe("createBooking", () => {
  it("sucesso: POST com o corpo exato e id = attemptId", async () => {
    const calls = stubFetch({
      ...okRoutes,
      "POST /bookings": (init) => json({ ...JSON.parse(String(init?.body)) }, 201),
    });
    await expect(createBooking(request, NOW)).resolves.toEqual({
      status: "created",
      bookingId: ID,
    });
    const post = calls.find((c) => c.method === "POST");
    expect(post?.body).toEqual({
      id: ID,
      hotelId: 1,
      roomId: 1,
      checkIn: "2026-12-20",
      checkOut: "2026-12-23",
      rooms: 1,
      adults: 2,
      children: 0,
      guests: [
        {
          firstName: "Ana",
          lastName: "Souza",
          email: "ana@exemplo.com",
          phone: "+5511987654321",
          kind: "adult",
        },
        { firstName: "Bruno", lastName: "Souza", kind: "adult" },
      ],
      totalPrice: 4140,
      payment: { method: "credit_card", cardLast4: "1111" },
      priceBreakdown: {
        nightlyCents: 120000,
        nights: 3,
        rooms: 1,
        subtotalCents: 360000,
        discountCents: 0,
        serviceFeeCents: 36000,
        taxCents: 18000,
        totalCents: 414000,
      },
      createdAt: "2026-11-19T15:04:05.000Z",
    });
    expect(JSON.stringify(post?.body)).not.toContain("4111");
  });

  it("POST 500 + GET 200 → created (resposta perdida ou duplicata)", async () => {
    stubFetch({
      ...okRoutes,
      "POST /bookings": () => json({ error: "x" }, 500),
      [`GET /bookings/${ID}`]: () => json(stored),
    });
    expect(await createBooking(request, NOW)).toEqual({ status: "created", bookingId: ID });
  });

  it("POST 500 + id existente de outro pedido → failed", async () => {
    stubFetch({
      ...okRoutes,
      "POST /bookings": () => json({ error: "x" }, 500),
      [`GET /bookings/${ID}`]: () => json({ ...stored, totalPrice: stored.totalPrice + 1 }),
    });
    expect(await createBooking(request, NOW)).toEqual({ status: "failed", kind: "http" });
  });

  it("POST 500 + GET 404 → failed", async () => {
    stubFetch({
      ...okRoutes,
      "POST /bookings": () => json({ error: "x" }, 500),
      [`GET /bookings/${ID}`]: () => json({}, 404),
    });
    expect(await createBooking(request, NOW)).toEqual({ status: "failed", kind: "http" });
  });

  it("erro de rede no POST também reconcilia", async () => {
    stubFetch({
      ...okRoutes,
      "POST /bookings": () => {
        throw new TypeError("fetch failed");
      },
      [`GET /bookings/${ID}`]: () => json(stored),
    });
    expect(await createBooking(request, NOW)).toEqual({ status: "created", bookingId: ID });
  });

  it("POST 400 não reconcilia", async () => {
    const calls = stubFetch({ ...okRoutes, "POST /bookings": () => json({ error: "x" }, 400) });
    expect(await createBooking(request, NOW)).toEqual({ status: "failed", kind: "http" });
    expect(calls.some((c) => c.url.startsWith("/bookings/"))).toBe(false);
  });

  it("hotel 404 → unavailable 0", async () => {
    stubFetch({ "GET /hotels/1": () => json({}, 404), "GET /rooms/1": () => json(makeRoom()) });
    expect(await createBooking(request, NOW)).toEqual({ status: "unavailable", available: 0 });
  });

  it("hotel com erro 500 → failed", async () => {
    stubFetch({ "GET /hotels/1": () => json({}, 500), "GET /rooms/1": () => json(makeRoom()) });
    expect(await createBooking(request, NOW)).toEqual({ status: "failed", kind: "http" });
  });

  it("entrada inválida → invalid, sem chamar a API", async () => {
    const calls = stubFetch({});
    const result = await createBooking(
      { ...request, contact: { ...request.contact, email: "x" } },
      NOW,
    );
    expect(result).toEqual({ status: "invalid", fields: ["contact.email"] });
    await expect(createBooking("lixo", NOW)).resolves.toEqual({ status: "invalid", fields: [] });
    expect(calls).toHaveLength(0);
  });

  it("preço defasado → price-changed (nada é gravado)", async () => {
    const calls = stubFetch({
      "GET /hotels/1": () => json(makeHotel()),
      "GET /rooms/1": () => json(makeRoom({ pricePerNight: 1300 })),
    });
    const result = await createBooking(request, NOW);
    expect(result).toMatchObject({ status: "price-changed", quote: { totalCents: 448500 } });
    expect(calls.some((c) => c.method === "POST")).toBe(false);
  });

  it("esgotou → unavailable com a sobra", async () => {
    stubFetch({
      "GET /hotels/1": () => json(makeHotel()),
      "GET /rooms/1": () => json(makeRoom({ available: 0 })),
    });
    expect(await createBooking(request, NOW)).toEqual({ status: "unavailable", available: 0 });
  });

  it("logs do servidor só com { event, kind, status }, sem PII", async () => {
    stubFetch({ ...okRoutes, "POST /bookings": () => json({ error: "ana@exemplo.com" }, 400) });
    await createBooking(request, NOW);
    expect(errorSpy).toHaveBeenCalledWith({
      event: "create-booking:post",
      kind: "http",
      status: 400,
    });
    expect(JSON.stringify(errorSpy.mock.calls)).not.toMatch(/ana@|Souza|\+55/);
  });
});
