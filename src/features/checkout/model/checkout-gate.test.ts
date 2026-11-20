import { describe, expect, it } from "vitest";
import { makeRoom, makeSearchCriteria } from "@/shared/testing/fixtures";
import { hotelBackHref, roomEligibility, selectionGate } from "./checkout-gate";

const criteria = makeSearchCriteria({ checkIn: "2026-12-20", checkOut: "2026-12-23" });
const selection = { hotelId: 1, roomId: 1, criteria };
const TODAY = "2026-11-19";

describe("selectionGate", () => {
  const base = { hydrated: true, selection, submitted: false, document: "ok" } as const;

  it.each([
    ["antes da hidratação nunca redireciona", { hydrated: false, selection: null }, "hydrating"],
    ["sem seleção depois da hidratação", { selection: null }, "redirect-empty"],
    ["com seleção", {}, "ready"],
    ["documento sem a CSP do checkout", { document: "reload" }, "reloading"],
    ["reserva criada e seleção limpa", { submitted: true, selection: null }, "leaving"],
    ["recarregando antes de hidratar", { document: "reload", hydrated: false }, "reloading"],
  ] as const)("%s", (_name, patch, expected) => {
    expect(selectionGate({ ...base, ...patch })).toBe(expected);
  });
});

describe("roomEligibility", () => {
  const eligible = (room: Parameters<typeof makeRoom>[0], sel = selection, hotelId = 1) =>
    roomEligibility({
      selection: sel,
      hotel: { id: hotelId },
      room: makeRoom(room),
      today: TODAY,
    });

  it("pronto", () => {
    expect(eligible({})).toBe("ready");
  });

  it.each([
    ["esgotado", { available: 0 }, "sold-out"],
    ["menos quartos que o pedido", { available: 1 }, "ready"],
    ["quarto de outro hotel", { hotelId: 2 }, "mismatch"],
    ["hóspedes acima do máximo", { maxGuests: 1 }, "too-small"],
  ] as const)("%s", (_name, room, expected) => {
    expect(eligible(room)).toBe(expected);
  });

  it("insufficient quando available < rooms", () => {
    const sel = { ...selection, criteria: { ...criteria, rooms: 2 } };
    expect(eligible({ available: 1 }, sel)).toBe("insufficient");
  });

  it("hotel diferente da seleção é mismatch", () => {
    expect(eligible({}, selection, 9)).toBe("mismatch");
  });

  it("datas passadas valem mais que esgotado", () => {
    const stale = {
      ...selection,
      criteria: { ...criteria, checkIn: "2026-11-18", checkOut: "2026-11-20" },
    };
    expect(eligible({ available: 0 }, stale)).toBe("stale-dates");
  });

  it("mismatch vale mais que tudo", () => {
    expect(eligible({ hotelId: 3, available: 0 })).toBe("mismatch");
  });
});

describe("hotelBackHref", () => {
  it("com critérios, exceto datas passadas", () => {
    expect(hotelBackHref(selection, "sold-out")).toMatch(/^\/hotel\/1\?destination=/);
    expect(hotelBackHref(selection, "stale-dates")).toBe("/hotel/1");
  });
});
