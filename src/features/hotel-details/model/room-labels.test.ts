import { describe, expect, it } from "vitest";
import { roomAmenitySchema } from "@/shared/api/schemas";
import { roomAmenityLabel, roomCapacityLabel, roomSizeLabel, roomTypesLabel } from "./room-labels";

describe("roomAmenityLabel", () => {
  it("toda comodidade de quarto tem rótulo pt-BR único", () => {
    const labels = roomAmenitySchema.options.map((amenity) => roomAmenityLabel(amenity, "pt-BR"));
    expect(labels.every((label) => label.length > 0)).toBe(true);
    expect(new Set(labels).size).toBe(labels.length);
    expect(roomAmenityLabel("ocean_view", "pt-BR")).toBe("Vista para o mar");
    expect(roomAmenityLabel("aircon", "pt-BR")).toBe("Ar-condicionado");
  });
});

describe("capacidade e tamanho", () => {
  it("hóspedes", () => {
    expect(roomCapacityLabel(1, "pt-BR")).toBe("1 hóspede");
    expect(roomCapacityLabel(3, "pt-BR")).toBe("Até 3 hóspedes");
  });

  it("metros quadrados", () => {
    expect(roomSizeLabel(45, "pt-BR")).toBe("45 m²");
    expect(roomSizeLabel(32.5, "pt-BR")).toBe("32,5 m²");
  });
});

describe("roomTypesLabel", () => {
  it("singular e plural", () => {
    expect(roomTypesLabel(1, "pt-BR")).toBe("1 tipo de quarto");
    expect(roomTypesLabel(4, "pt-BR")).toBe("4 tipos de quarto");
  });
});
