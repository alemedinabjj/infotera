import { describe, expect, it } from "vitest";
import { HOTEL_SECTIONS, sectionHeadingId, sectionLabel } from "./sections";

describe("HOTEL_SECTIONS", () => {
  it("ordem da página, ids únicos e sem acento", () => {
    expect(HOTEL_SECTIONS.map((section) => section.id)).toEqual([
      "visao-geral",
      "quartos",
      "localizacao",
      "politicas",
      "avaliacoes",
      "similares",
    ]);
    expect(HOTEL_SECTIONS.map((section) => sectionLabel(section.key))).toEqual([
      "Visão geral",
      "Quartos",
      "Localização",
      "Políticas",
      "Avaliações",
      "Similares",
    ]);
    expect(HOTEL_SECTIONS.map((section) => sectionLabel(section.key, "en-US"))).toEqual([
      "Overview",
      "Rooms",
      "Location",
      "Policies",
      "Reviews",
      "Similar",
    ]);
    expect(sectionHeadingId("quartos")).toBe("quartos-titulo");
  });
});
