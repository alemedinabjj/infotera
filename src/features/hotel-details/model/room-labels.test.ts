import { describe, expect, it } from "vitest";
import { type Bed, roomAmenitySchema } from "@/shared/api/schemas";
import { bedsLabel, roomAmenityLabel, roomCapacityLabel, roomSizeLabel } from "./room-labels";

describe("roomAmenityLabel", () => {
  it("toda comodidade de quarto tem rótulo pt-BR único", () => {
    const labels = roomAmenitySchema.options.map(roomAmenityLabel);
    expect(labels.every((label) => label.length > 0)).toBe(true);
    expect(new Set(labels).size).toBe(labels.length);
    expect(roomAmenityLabel("ocean_view")).toBe("Vista para o mar");
    expect(roomAmenityLabel("aircon")).toBe("Ar-condicionado");
  });
});

describe("bedsLabel", () => {
  const label = (...beds: Bed[]) => bedsLabel(beds);

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
    expect(bedsLabel([])).toBe("");
  });
});

describe("capacidade e tamanho", () => {
  it("hóspedes", () => {
    expect(roomCapacityLabel(1)).toBe("1 hóspede");
    expect(roomCapacityLabel(3)).toBe("Até 3 hóspedes");
  });

  it("metros quadrados", () => {
    expect(roomSizeLabel(45)).toBe("45 m²");
    expect(roomSizeLabel(32.5)).toBe("32,5 m²");
  });
});
