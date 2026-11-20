import { describe, expect, it } from "vitest";
import { makeHotel } from "@/shared/testing/fixtures";
import { toPhotoPrerenderParams, toPrerenderParams } from "./prerender";

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

const IMG = "https://images.unsplash.com/photo-1";

describe("toPhotoPrerenderParams", () => {
  it("uma entrada por foto (1-based, como na URL), por hotel em ordem de id", () => {
    const hotels = [
      makeHotel({ id: 2, images: [IMG, IMG] }),
      makeHotel({ id: 1, images: [IMG, IMG, IMG] }),
    ];
    expect(toPhotoPrerenderParams(hotels)).toEqual([
      { hotelId: "1", photo: "1" },
      { hotelId: "1", photo: "2" },
      { hotelId: "1", photo: "3" },
      { hotelId: "2", photo: "1" },
      { hotelId: "2", photo: "2" },
    ]);
  });

  it("deduplica hotéis repetidos", () => {
    const hotel = makeHotel({ id: 3, images: [IMG] });
    expect(toPhotoPrerenderParams([hotel, hotel])).toEqual([{ hotelId: "3", photo: "1" }]);
  });

  it("sem nenhuma foto em nenhum hotel, lança (a lista nunca pode ser vazia)", () => {
    expect(() => toPhotoPrerenderParams([makeHotel({ id: 1, images: [] })])).toThrow(
      "A API não listou nenhum hotel: não há o que pré-renderizar.",
    );
  });
});
