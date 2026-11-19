import { describe, expect, it } from "vitest";
import { roomAmenitySchema } from "@/shared/api/schemas";
import { roomAmenityLabel, roomCapacityLabel, roomSizeLabel, roomTypesLabel } from "./room-labels";

describe("roomAmenityLabel", () => {
  it("toda comodidade de quarto tem rótulo pt-BR único", () => {
    const labels = roomAmenitySchema.options.map(roomAmenityLabel);
    expect(labels.every((label) => label.length > 0)).toBe(true);
    expect(new Set(labels).size).toBe(labels.length);
    expect(roomAmenityLabel("ocean_view")).toBe("Vista para o mar");
    expect(roomAmenityLabel("aircon")).toBe("Ar-condicionado");
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

describe("roomTypesLabel", () => {
  it("singular e plural", () => {
    expect(roomTypesLabel(1)).toBe("1 tipo de quarto");
    expect(roomTypesLabel(4)).toBe("4 tipos de quarto");
  });
});
