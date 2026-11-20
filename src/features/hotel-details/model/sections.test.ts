import { describe, expect, it } from "vitest";
import { HOTEL_SECTIONS, sectionHeadingId } from "./sections";

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
    expect(HOTEL_SECTIONS.map((section) => section.label)).toEqual([
      "Visão geral",
      "Quartos",
      "Localização",
      "Políticas",
      "Avaliações",
      "Similares",
    ]);
    expect(sectionHeadingId("quartos")).toBe("quartos-titulo");
  });
});
