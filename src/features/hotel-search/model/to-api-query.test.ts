import { describe, expect, it } from "vitest";
import { buildQuery } from "@/shared/api/http";
import { type Amenity, amenitySchema, hotelSchema } from "@/shared/api/schemas";
import seed from "../../../../mock-api/db.seed.json";
import { DEFAULT_FILTERS } from "./search-filters";
import {
  amenitiesPattern,
  hotelsRequestKey,
  toHotelsApiQuery,
  toHotelsFilterQuery,
  toHotelsRequest,
} from "./to-api-query";

const RIO = "Rio de Janeiro, RJ";

describe("toHotelsApiQuery", () => {
  it("padrões: só destino, ordenação popular e página 1", () => {
    expect(toHotelsApiQuery(RIO, DEFAULT_FILTERS, "popular")).toEqual({
      destination: RIO,
      _sort: "reviewCount,id",
      _order: "desc,asc",
      _page: 1,
      _limit: 10,
    });
  });

  it("mapeia cada filtro para o param da API", () => {
    expect(
      toHotelsApiQuery(
        RIO,
        {
          minPrice: 200,
          maxPrice: 1500,
          minRating: 4.5,
          types: ["hotel", "resort"],
          amenities: [],
          sort: "rating-desc",
          view: "pages",
          map: false,
          page: 2,
        },
        "rating-desc",
      ),
    ).toEqual({
      destination: RIO,
      pricePerNight_gte: 200,
      pricePerNight_lte: 1500,
      rating_gte: 4.5,
      propertyType: ["hotel", "resort"],
      _sort: "rating,reviewCount",
      _order: "desc,desc",
      _page: 2,
      _limit: 10,
    });
  });

  it("omite 0 e 3.000 (sem mínimo / sem máximo)", () => {
    const query = toHotelsApiQuery(
      RIO,
      { ...DEFAULT_FILTERS, minPrice: 0, maxPrice: 3000 },
      "popular",
    );
    expect(query).not.toHaveProperty("pricePerNight_gte");
    expect(query).not.toHaveProperty("pricePerNight_lte");
  });

  it("menor preço desempata por id", () => {
    expect(toHotelsApiQuery(RIO, DEFAULT_FILTERS, "price-asc")).toMatchObject({
      _sort: "pricePerNight,id",
      _order: "asc,asc",
    });
  });

  it("exemplo exato do contrato (piscina + spa, menor preço, página 1)", () => {
    const query = toHotelsApiQuery(
      RIO,
      {
        ...DEFAULT_FILTERS,
        amenities: ["pool", "spa"],
      },
      "price-asc",
    );
    expect(buildQuery({ ...query }).toString()).toBe(
      "destination=Rio+de+Janeiro%2C+RJ&amenities_like=%5E%28%3F%3D.*%5Cbpool%5Cb%29%28%3F%3D.*%5Cbspa%5Cb%29&_sort=pricePerNight%2Cid&_order=asc%2Casc&_page=1&_limit=10",
    );
  });

  it("propertyType repete a chave", () => {
    const params = buildQuery({
      ...toHotelsApiQuery(RIO, { ...DEFAULT_FILTERS, types: ["hotel", "pousada"] }, "popular"),
    });
    expect(params.getAll("propertyType")).toEqual(["hotel", "pousada"]);
  });
});

describe("toHotelsRequest", () => {
  it.each([
    ["popular", "reviewCount,id", "desc,asc"],
    ["price-asc", "pricePerNight,id", "asc,asc"],
    ["rating-desc", "rating,reviewCount", "desc,desc"],
  ] as const)("%s sai igual à F3 (kind server)", (sort, _sort, _order) => {
    const filters = { ...DEFAULT_FILTERS, sort, page: 2 };
    expect(toHotelsRequest(RIO, filters)).toEqual({
      kind: "server",
      query: { destination: RIO, _sort, _order, _page: 2, _limit: 10 },
    });
  });

  it("distance leva só os filtros de servidor: sem _sort, _page nem _limit", () => {
    const request = toHotelsRequest(RIO, {
      ...DEFAULT_FILTERS,
      sort: "distance",
      amenities: ["pool"],
      page: 2,
    });
    expect(request).toEqual({
      kind: "distance",
      filterQuery: { destination: RIO, amenities_like: amenitiesPattern(["pool"]) },
      page: 2,
      limit: 10,
    });
    expect(Object.keys(toHotelsFilterQuery(RIO, DEFAULT_FILTERS))).toEqual(["destination"]);
  });

  it("aceita outra página (feed) sem mexer na URL", () => {
    const request = toHotelsRequest(RIO, DEFAULT_FILTERS, 3);
    expect(request.kind === "server" && request.query._page).toBe(3);
  });
});

describe("hotelsRequestKey", () => {
  const popular = { ...DEFAULT_FILTERS };
  const distance = { ...DEFAULT_FILTERS, sort: "distance" as const };

  it("server usa a própria query da API", () => {
    const request = toHotelsRequest(RIO, popular);
    expect(request.kind === "server" && hotelsRequestKey(request)).toEqual(
      toHotelsApiQuery(RIO, popular, "popular"),
    );
  });

  it("distance muda por página e difere da ordenação de API e da lista inteira", () => {
    const page1 = hotelsRequestKey(toHotelsRequest(RIO, distance, 1));
    const page2 = hotelsRequestKey(toHotelsRequest(RIO, distance, 2));
    expect(page1).not.toEqual(page2);
    expect(page1).toMatchObject({ sort: "distance", page: 1, limit: 10 });
    expect(page1).not.toEqual(hotelsRequestKey(toHotelsRequest(RIO, popular, 1)));
    expect(page1).not.toEqual(toHotelsFilterQuery(RIO, distance));
  });
});

describe("amenitiesPattern", () => {
  it("ordena pela ordem do enum (chave estável)", () => {
    expect(amenitiesPattern(["spa", "pool"])).toBe(amenitiesPattern(["pool", "spa"]));
  });

  it("uma comodidade", () => {
    expect(amenitiesPattern(["wifi"])).toBe("^(?=.*\\bwifi\\b)");
  });
});

describe("amenitiesPattern contra o seed inteiro (emulando o _like do json-server)", () => {
  const hotels = seed.hotels.map((hotel) => hotelSchema.parse(hotel));
  const matchesApi = (pattern: string, amenities: Amenity[]): boolean =>
    new RegExp(pattern, "i").test(String(amenities));

  const options = amenitySchema.options;
  const combos: Amenity[][] = [
    ...options.map((a) => [a]),
    ...options.flatMap((a, i) => options.slice(i + 1).map((b) => [a, b])),
  ];

  it("equivale a `every` para todas as combinações de 1 e 2 comodidades", () => {
    expect(combos.length).toBe(15 + 105);
    for (const combo of combos) {
      const pattern = amenitiesPattern(combo);
      for (const hotel of hotels) {
        const expected = combo.every((amenity) => hotel.amenities.includes(amenity));
        expect(matchesApi(pattern, hotel.amenities), `${hotel.id} ${combo.join("+")}`).toBe(
          expected,
        );
      }
    }
  });

  it("não casa substring: `access` não existe e beach_access não vira lounge_access", () => {
    expect(matchesApi(amenitiesPattern(["lounge_access"]), ["beach_access"])).toBe(false);
  });
});
