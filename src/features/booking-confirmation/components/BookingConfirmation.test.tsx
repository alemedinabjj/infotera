import { isValidElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BOOKING_ID, makeBooking } from "@/shared/testing/fixtures";
import { parseBookingId } from "../model/booking-id";
import { BookingConfirmation } from "./BookingConfirmation";
import { ConfirmationView } from "./ConfirmationView";
import { UnreadableBooking } from "./UnreadableBooking";

vi.mock("@/shared/i18n/server", () => ({ getLocale: vi.fn(async () => "pt-BR") }));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw Object.assign(new Error("NEXT_HTTP_ERROR_FALLBACK;404"), {
      digest: "NEXT_HTTP_ERROR_FALLBACK;404",
    });
  },
}));

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

const id = (() => {
  const parsed = parseBookingId(BOOKING_ID);
  if (!parsed) throw new Error("id inválido");
  return parsed;
})();

beforeEach(() => vi.spyOn(console, "error").mockImplementation(() => undefined));
afterEach(() => vi.unstubAllGlobals());

describe("BookingConfirmation", () => {
  it("encontrada: o recibo recebe a reserva e a promessa de hotel e quarto, sem esperar por elas", async () => {
    const calls: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        const path = new URL(url).pathname;
        calls.push(path);
        if (path.startsWith("/bookings/")) return json(makeBooking());
        return new Promise<Response>(() => undefined); // hotel e quarto nunca respondem
      }),
    );
    const element = await BookingConfirmation({ id });
    expect(isValidElement(element)).toBe(true);
    if (!isValidElement<{ booking: { id: string }; details: Promise<unknown> }>(element)) return;
    expect(element.type).toBe(ConfirmationView);
    expect(element.props.booking.id).toBe(BOOKING_ID);
    expect(element.props.details).toBeInstanceOf(Promise);
    expect(calls).toEqual([`/bookings/${BOOKING_ID}`, "/hotels/1", "/rooms/1"]);
  });

  it("404 vira notFound()", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => json({}, 404)),
    );
    await expect(BookingConfirmation({ id })).rejects.toMatchObject({
      digest: "NEXT_HTTP_ERROR_FALLBACK;404",
    });
  });

  it("corpo fora do contrato: estado ilegível, sem buscar hotel nem quarto", async () => {
    const fetchMock = vi.fn(async () => json({ id: BOOKING_ID }));
    vi.stubGlobal("fetch", fetchMock);
    const element = await BookingConfirmation({ id });
    expect(isValidElement(element) && element.type).toBe(UnreadableBooking);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("5xx é relançado (cai no error.tsx)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => json({ error: "x" }, 500)),
    );
    await expect(BookingConfirmation({ id })).rejects.toMatchObject({ kind: "http", status: 500 });
  });
});
