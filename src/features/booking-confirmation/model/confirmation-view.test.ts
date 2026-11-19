import { describe, expect, it } from "vitest";
import type { Hotel, Room } from "@/shared/api/schemas";
import { makeBooking, makeHotel, makeRoom } from "@/shared/testing/fixtures";
import { checkTimes, toBookingView, toStayView } from "./confirmation-view";
import type { Settled } from "./load-result";

const TODAY = "2026-11-19";
const plain = (value: string) => value.replaceAll(" ", " ");

const ok = <T>(data: T): Settled<T> => ({ status: "ok", data });
const missing = { status: "missing" } as const;
const failed = { status: "error" } as const;

describe("toBookingView", () => {
  it("formato da F5 completo", () => {
    const view = toBookingView(makeBooking(), TODAY);
    expect(view).toMatchObject({
      number: "3f2a9c1e-7b4d-4e8a-9f12-6c0d3b2a1e57",
      bookedAt: "19/11/2026, 12:04",
      stayLabel: "12–15 dez · 3 noites",
      stayDetails: "3 noites · 2 adultos, 1 criança · 1 quarto",
      checkInDate: "sáb., 12 de dez.",
      checkOutDate: "ter., 15 de dez.",
      cardLast4: "1111",
    });
    expect(view.price.kind).toBe("breakdown");
    if (view.price.kind === "breakdown") {
      expect(view.price.totalCents).toBe(372600);
      expect(view.price.lines.map((line) => line.kind)).toEqual([
        "stay",
        "discount",
        "service-fee",
        "tax",
      ]);
    }
    expect(view.guests.holderEmail).toBe("ana.souza@exemplo.com");
  });

  it("noites saem das datas da reserva, no singular também", () => {
    const view = toBookingView(
      makeBooking({ checkIn: "2026-12-12", checkOut: "2026-12-13" }),
      TODAY,
    );
    expect(view.stayLabel).toBe("12–13 dez · 1 noite");
  });

  it("o ano aparece quando a estadia não é no ano de hoje", () => {
    expect(toBookingView(makeBooking(), "2025-06-01").stayLabel).toBe("12–15 dez 2026 · 3 noites");
  });

  it("formato do README: sem hóspedes, sem pagamento, só o total", () => {
    const view = toBookingView(
      makeBooking({ guests: [], payment: undefined, priceBreakdown: undefined, totalPrice: 4140 }),
      TODAY,
    );
    expect(view.guests).toEqual({ holderEmail: null, lines: [] });
    expect(view.cardLast4).toBeNull();
    expect(view.price).toEqual({ kind: "total-only", totalCents: 414000 });
  });

  it("sem payment não há linha de cartão", () => {
    expect(toBookingView(makeBooking({ payment: undefined }), TODAY).cardLast4).toBeNull();
  });

  it("breakdown cujas linhas não somam o total vira só o total de totalPrice", () => {
    const { priceBreakdown } = makeBooking();
    if (!priceBreakdown) throw new Error("fixture sem breakdown");
    const view = toBookingView(
      makeBooking({ priceBreakdown: { ...priceBreakdown, taxCents: 1 } }),
      TODAY,
    );
    expect(view.price).toEqual({ kind: "total-only", totalCents: 372600 });
  });

  it("breakdown com total diferente de totalPrice vira só o totalPrice", () => {
    const view = toBookingView(makeBooking({ totalPrice: 1 }), TODAY);
    expect(view.price).toEqual({ kind: "total-only", totalCents: 100 });
  });

  it("privacidade: telefone, idade e dados do cartão fora do resumo, exceto o campo de pagamento", () => {
    const text = JSON.stringify(toBookingView(makeBooking(), TODAY));
    expect(text).not.toContain("98765");
    expect(text).not.toContain('"age"');
    expect(text.match(/1111/g)).toHaveLength(1);
    expect(text).toContain('"cardLast4":"1111"');
  });

  it("noites negativas (datas forjadas) não aparecem", () => {
    const view = toBookingView(
      makeBooking({ checkIn: "2026-12-15", checkOut: "2026-12-12" }),
      TODAY,
    );
    expect(view.stayDetails.startsWith("0 noites")).toBe(true);
  });
});

describe("toStayView", () => {
  const booking = makeBooking();
  const hotel = makeHotel();
  const room = makeRoom({
    beds: [
      { type: "king", quantity: 1 },
      { type: "sofa_bed", quantity: 1 },
    ],
  });

  it("hotel e quarto ok", () => {
    const view = toStayView(booking, ok(hotel), ok(room));
    expect(view.errorTitle).toBeNull();
    expect(view.hotel).toMatchObject({
      status: "ok",
      name: "Hotel Copacabana Palace",
      href: "/hotel/1",
      cancellation: { label: "Cancelamento grátis", tone: "success" },
    });
    expect(view.room).toEqual({
      status: "ok",
      name: "Suíte Deluxe",
      beds: "1 cama king e 1 sofá-cama",
    });
    expect(view.checkInTime).toBe("A partir de 15:00");
    expect(view.checkOutTime).toBe("Até 12:00");
  });

  it.each<[string, Settled<Hotel>, Settled<Room>, string | null]>([
    ["hotel com erro", failed, ok(room), "Não foi possível carregar os dados do hotel."],
    ["quarto com erro", ok(hotel), failed, "Não foi possível carregar os dados do quarto."],
    [
      "os dois com erro",
      failed,
      failed,
      "Não foi possível carregar os dados do hotel e do quarto.",
    ],
    ["hotel missing não é erro", missing, ok(room), null],
    ["quarto missing não é erro", ok(hotel), missing, null],
    [
      "missing e erro: só o erro tem retry",
      missing,
      failed,
      "Não foi possível carregar os dados do quarto.",
    ],
  ])("%s", (_name, hotelResult, roomResult, title) => {
    expect(toStayView(booking, hotelResult, roomResult).errorTitle).toBe(title);
  });

  it("hotel missing: id da reserva, aviso e horários a confirmar", () => {
    const view = toStayView(makeBooking({ hotelId: 9999 }), missing, ok(room));
    expect(view.hotel).toEqual({
      status: "missing",
      title: "Hotel #9999",
      notice: "Os dados deste hotel não estão mais disponíveis.",
    });
    expect(view.checkInTime).toBe("Confirme com o hotel");
    expect(view.checkOutTime).toBe("Confirme com o hotel");
  });

  it("hotel com erro: horários indisponíveis", () => {
    const view = toStayView(booking, failed, ok(room));
    expect(view.hotel).toEqual({ status: "error" });
    expect(view.checkInTime).toBe("Indisponível no momento");
  });

  it("quarto missing", () => {
    expect(toStayView(makeBooking({ roomId: 77 }), ok(hotel), missing).room).toEqual({
      status: "missing",
      title: "Quarto #77",
      notice: "Os dados deste quarto não estão mais disponíveis.",
    });
  });

  it("quarto de outro hotel (reserva forjada) conta como missing", () => {
    const view = toStayView(booking, ok(hotel), ok(makeRoom({ hotelId: 2 })));
    expect(view.room.status).toBe("missing");
    expect(JSON.stringify(view)).not.toContain("Suíte Deluxe");
  });

  it("quarto ok e hotel ok não repetem o preço nem dados da reserva", () => {
    expect(plain(JSON.stringify(toStayView(booking, ok(hotel), ok(room))))).not.toContain("Ana");
  });
});

describe("checkTimes", () => {
  it.each<[string, Settled<Hotel>, string, string]>([
    ["ok", ok(makeHotel()), "A partir de 15:00", "Até 12:00"],
    ["missing", { status: "missing" }, "Confirme com o hotel", "Confirme com o hotel"],
    ["error", { status: "error" }, "Indisponível no momento", "Indisponível no momento"],
  ])("hotel %s", (_name, hotel, checkIn, checkOut) => {
    expect(checkTimes(hotel)).toEqual({ checkInTime: checkIn, checkOutTime: checkOut });
  });
});
