import { describe, expect, it } from "vitest";
import { pickCardAmenities } from "./card-amenities";

describe("pickCardAmenities", () => {
  it("até 3 na ordem do hotel e o resto vira +N", () => {
    expect(pickCardAmenities(["wifi", "pool", "spa", "gym", "bar"], [])).toEqual({
      shown: ["wifi", "pool", "spa"],
      hiddenCount: 2,
    });
  });

  it("as filtradas vêm primeiro", () => {
    expect(pickCardAmenities(["wifi", "pool", "spa", "gym", "bar"], ["bar", "spa"])).toEqual({
      shown: ["spa", "bar", "wifi"],
      hiddenCount: 2,
    });
  });

  it("filtrada que o hotel não tem é ignorada", () => {
    expect(pickCardAmenities(["wifi"], ["spa"])).toEqual({ shown: ["wifi"], hiddenCount: 0 });
  });

  it("sem comodidades", () => {
    expect(pickCardAmenities([], ["spa"])).toEqual({ shown: [], hiddenCount: 0 });
  });

  it("respeita limite customizado", () => {
    expect(pickCardAmenities(["wifi", "pool"], [], 1)).toEqual({ shown: ["wifi"], hiddenCount: 1 });
  });
});
