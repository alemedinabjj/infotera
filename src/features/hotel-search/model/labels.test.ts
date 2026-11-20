import { describe, expect, it } from "vitest";
import { amenitySchema, propertyTypeSchema } from "@/shared/api/schemas";
import {
  AMENITY_DISPLAY_ORDER,
  amenityLabel,
  PROPERTY_TYPE_DISPLAY_ORDER,
  propertyTypeLabel,
  sortLabel,
} from "./labels";
import { SORT_OPTIONS } from "./search-filters";

describe("labels", () => {
  it("a ordem de exibição das comodidades cobre o enum inteiro, sem repetir", () => {
    expect([...AMENITY_DISPLAY_ORDER].sort()).toEqual([...amenitySchema.options].sort());
  });

  it("a ordem dos tipos cobre o enum inteiro", () => {
    expect([...PROPERTY_TYPE_DISPLAY_ORDER].sort()).toEqual([...propertyTypeSchema.options].sort());
  });

  it("toda comodidade e todo tipo têm rótulo em pt-BR", () => {
    for (const amenity of amenitySchema.options) expect(amenityLabel(amenity)).not.toBe("");
    expect(amenityLabel("wifi")).toBe("Wi-Fi");
    expect(amenityLabel("beach_access")).toBe("Acesso à praia");
    expect(propertyTypeLabel("pousada")).toBe("Pousada");
  });

  it("ordenações", () => {
    expect(SORT_OPTIONS.map(sortLabel)).toEqual([
      "Mais populares",
      "Menor preço",
      "Maior avaliação",
    ]);
  });
});
