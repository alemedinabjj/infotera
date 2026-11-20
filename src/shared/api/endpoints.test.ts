import { afterEach, describe, expect, it, vi } from "vitest";
import { BOOKING_ID, makeBooking } from "../testing/fixtures";
import { fetchBooking } from "./endpoints";
import { isApiError } from "./http";

const fetchMock = vi.fn<typeof fetch>();
const json = (body: unknown, init?: ResponseInit) =>
  new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json" },
    ...init,
  });

afterEach(() => {
  fetchMock.mockReset();
  vi.unstubAllGlobals();
});

describe("fetchBooking", () => {
  it("lê a reserva pelo id e aplica o schema", async () => {
    fetchMock.mockResolvedValue(json(makeBooking()));
    vi.stubGlobal("fetch", fetchMock);
    const booking = await fetchBooking(BOOKING_ID);
    expect(booking.id).toBe(BOOKING_ID);
    expect(String(fetchMock.mock.calls[0]?.[0])).toMatch(new RegExp(`/bookings/${BOOKING_ID}$`));
  });

  it("codifica o id no path: a barra vira %2F e nada escapa do recurso", async () => {
    fetchMock.mockResolvedValue(json({}, { status: 404 }));
    vi.stubGlobal("fetch", fetchMock);
    await fetchBooking("../hotels/1").catch(() => undefined);
    expect(String(fetchMock.mock.calls[0]?.[0])).toMatch(/\/bookings\/\.\.%2Fhotels%2F1$/);
  });

  it("404 vira ApiError com status 404", async () => {
    fetchMock.mockResolvedValue(json({}, { status: 404 }));
    vi.stubGlobal("fetch", fetchMock);
    const error = await fetchBooking(BOOKING_ID).catch((e: unknown) => e);
    expect(isApiError(error) && error.status).toBe(404);
  });

  it("corpo fora do contrato vira ApiError parse", async () => {
    fetchMock.mockResolvedValue(json({ id: BOOKING_ID }));
    vi.stubGlobal("fetch", fetchMock);
    const error = await fetchBooking(BOOKING_ID).catch((e: unknown) => e);
    expect(isApiError(error) && error.kind).toBe("parse");
  });
});
