import { describe, expect, it } from "vitest";
import { sortLabel } from "./labels";
import { SORT_OPTIONS } from "./search-filters";

describe("labels", () => {
  it("ordenações", () => {
    expect(SORT_OPTIONS.map(sortLabel)).toEqual([
      "Mais populares",
      "Menor preço",
      "Maior avaliação",
    ]);
  });
});
