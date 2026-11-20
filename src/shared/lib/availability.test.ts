import { describe, expect, it } from "vitest";
import { type AvailabilityStatus, availabilityStatus, describeAvailability } from "./availability";

describe("availabilityStatus", () => {
  it.each<[number, number, AvailabilityStatus]>([
    [0, 1, "sold-out"],
    [0, 3, "sold-out"],
    [1, 1, "scarce"],
    [2, 1, "scarce"],
    [2, 2, "scarce"],
    [2, 3, "insufficient"],
    [1, 2, "insufficient"],
    [3, 1, "available"],
    [3, 3, "available"],
    [12, 4, "available"],
  ])("%i disponíveis para %i quartos → %s", (available, requested, expected) => {
    expect(availabilityStatus(available, requested)).toBe(expected);
  });
});

describe("describeAvailability", () => {
  const describe_ = (
    status: AvailabilityStatus,
    available: number,
    requested = 1,
    hasDates = true,
  ) =>
    describeAvailability({
      locale: "pt-BR",
      status,
      availableRooms: available,
      requestedRooms: requested,
      hasDates,
    });

  it("esgotado: selo danger e nota conforme haja datas", () => {
    expect(describe_("sold-out", 0)).toEqual({
      badge: { tone: "danger", text: "Esgotado" },
      note: "Sem quartos disponíveis para estas datas.",
    });
    expect(describe_("sold-out", 0, 1, false).note).toBe("Sem quartos disponíveis no momento.");
  });

  it("escassez: singular e plural", () => {
    expect(describe_("scarce", 1).badge?.text).toBe("Apenas 1 quarto!");
    expect(describe_("scarce", 2).badge?.text).toBe("Apenas 2 quartos!");
  });

  it("insuficiente: quantos há e quantos a busca pede", () => {
    expect(describe_("insufficient", 2, 3)).toEqual({
      badge: { tone: "warning", text: "Só 2 quartos disponíveis" },
      note: "Sua busca pede 3 quartos.",
    });
    expect(describe_("insufficient", 1, 2).badge?.text).toBe("Só 1 quarto disponível");
  });

  it("disponível: nada", () => {
    expect(describe_("available", 9)).toEqual({ badge: null, note: null });
  });
});
