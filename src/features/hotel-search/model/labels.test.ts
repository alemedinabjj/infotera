import { describe, expect, it } from "vitest";
import { listModeLabel, sortLabel } from "./labels";
import { LIST_MODES, SORT_OPTIONS } from "./search-filters";

describe("labels", () => {
  it("ordenações", () => {
    expect(SORT_OPTIONS.map((option) => sortLabel(option, "pt-BR"))).toEqual([
      "Mais populares",
      "Menor preço",
      "Maior avaliação",
      "Distância do centro",
    ]);
  });

  it("modos de listagem", () => {
    expect(LIST_MODES.map((option) => listModeLabel(option, "pt-BR"))).toEqual([
      "Em páginas",
      "Rolagem contínua",
    ]);
  });
});
