import { describe, expect, it } from "vitest";
import { favoritesMessages } from "./messages";

describe("favoritesMessages", () => {
  it("a contagem usa singular só com 1", () => {
    const pt = favoritesMessages.get("pt-BR");
    const en = favoritesMessages.get("en-US");
    expect([pt.count(1), pt.count(0), pt.count(3)]).toEqual([
      "1 hotel salvo",
      "0 hotéis salvos",
      "3 hotéis salvos",
    ]);
    expect([en.count(1), en.count(0), en.count(3)]).toEqual([
      "1 saved hotel",
      "0 saved hotels",
      "3 saved hotels",
    ]);
  });
});
