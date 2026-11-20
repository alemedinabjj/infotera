import { describe, expect, it } from "vitest";
import type { Bed } from "../api/schemas";
import { bedsLabel } from "./room-labels";

describe("bedsLabel", () => {
  const label = (...beds: Bed[]) => bedsLabel(beds, "pt-BR");

  it("singular e plural de cada tipo", () => {
    expect(label({ type: "single", quantity: 1 })).toBe("1 cama de solteiro");
    expect(label({ type: "single", quantity: 2 })).toBe("2 camas de solteiro");
    expect(label({ type: "double", quantity: 1 })).toBe("1 cama de casal");
    expect(label({ type: "queen", quantity: 2 })).toBe("2 camas queen");
    expect(label({ type: "king", quantity: 1 })).toBe("1 cama king");
    expect(label({ type: "twin", quantity: 2 })).toBe("2 camas twin");
    expect(label({ type: "sofa_bed", quantity: 1 })).toBe("1 sofá-cama");
    expect(label({ type: "sofa_bed", quantity: 2 })).toBe("2 sofás-camas");
  });

  it("junta com vírgula e 'e'", () => {
    expect(label({ type: "king", quantity: 1 }, { type: "sofa_bed", quantity: 1 })).toBe(
      "1 cama king e 1 sofá-cama",
    );
    expect(
      label(
        { type: "king", quantity: 1 },
        { type: "twin", quantity: 2 },
        { type: "sofa_bed", quantity: 1 },
      ),
    ).toBe("1 cama king, 2 camas twin e 1 sofá-cama");
  });

  it("sem camas: vazio", () => {
    expect(bedsLabel([], "pt-BR")).toBe("");
  });
});
