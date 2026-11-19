import { describe, expect, it } from "vitest";
import { listModeLabel, sortLabel } from "./labels";
import { LIST_MODES, SORT_OPTIONS } from "./search-filters";

describe("labels", () => {
  it("ordenações", () => {
    expect(SORT_OPTIONS.map(sortLabel)).toEqual([
      "Mais populares",
      "Menor preço",
      "Maior avaliação",
      "Distância do centro",
    ]);
  });

  it("modos de listagem", () => {
    expect(LIST_MODES.map(listModeLabel)).toEqual(["Em páginas", "Rolagem contínua"]);
  });
});
