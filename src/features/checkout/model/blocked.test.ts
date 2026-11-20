import { describe, expect, it } from "vitest";
import { makeSearchCriteria } from "@/shared/testing/fixtures";
import { type BlockedReason, describeBlocked } from "./blocked";

const criteria = makeSearchCriteria({
  checkIn: "2026-12-12",
  checkOut: "2026-12-15",
  rooms: 3,
  adults: 3,
});
const copy = (reason: BlockedReason) =>
  describeBlocked({
    locale: "pt-BR",
    reason,
    criteria,
    roomName: "Suíte",
    available: 2,
    maxGuests: 2,
    today: "2026-11-19",
  });

describe("describeBlocked", () => {
  it("esgotado", () => {
    expect(copy("sold-out")).toEqual({
      title: "Este quarto esgotou",
      description:
        "Não há mais unidades de Suíte para 12–15 dez. Escolha outro quarto no mesmo hotel.",
      action: "Ver quartos",
    });
  });

  it("poucos quartos", () => {
    expect(copy("insufficient")).toMatchObject({
      title: "Só 2 quartos disponíveis",
      description:
        "Sua reserva pede 3 quartos de Suíte. Volte ao hotel para escolher outro quarto ou reduzir a quantidade de quartos.",
    });
  });

  it("quarto pequeno", () => {
    expect(copy("too-small").description).toBe(
      "Suíte acomoda até 2 hóspedes por quarto e sua busca tem 1. Escolha outro quarto ou altere os hóspedes.",
    );
  });

  it("datas passadas leva a novas datas", () => {
    expect(copy("stale-dates")).toMatchObject({
      title: "As datas desta reserva já passaram",
      description:
        "O check-in era em 12/12/2026. Escolha novas datas para ver preço e disponibilidade.",
      action: "Escolher novas datas",
    });
  });
});
