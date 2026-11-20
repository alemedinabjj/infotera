import { describe, expect, it } from "vitest";
import { makeHotel } from "@/shared/testing/fixtures";
import { toPrerenderParams } from "./prerender";

describe("toPrerenderParams", () => {
  it("ordena por id e devolve o id como string", () => {
    const hotels = [makeHotel({ id: 10 }), makeHotel({ id: 2 }), makeHotel({ id: 1 })];
    expect(toPrerenderParams(hotels)).toEqual([
      { hotelId: "1" },
      { hotelId: "2" },
      { hotelId: "10" },
    ]);
  });

  it("deduplica ids repetidos", () => {
    const hotels = [makeHotel({ id: 3 }), makeHotel({ id: 3 }), makeHotel({ id: 4 })];
    expect(toPrerenderParams(hotels)).toEqual([{ hotelId: "3" }, { hotelId: "4" }]);
  });

  it("lança com mensagem em português se a lista for vazia", () => {
    expect(() => toPrerenderParams([])).toThrow(
      "A API não listou nenhum hotel: não há o que pré-renderizar.",
    );
  });
});
