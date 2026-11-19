import { describe, expect, it } from "vitest";
import {
  countActiveFilters,
  DEFAULT_FILTERS,
  hasActiveFilters,
  parseSearchFilters,
  type SearchFilters,
  serializeSearchFilters,
  withFilters,
} from "./search-filters";

const parse = (query: string) => parseSearchFilters(new URLSearchParams(query));

const FULL: SearchFilters = {
  minPrice: 200,
  maxPrice: 1500,
  minRating: 4.5,
  types: ["hotel", "resort"],
  amenities: ["wifi", "pool", "spa"],
  sort: "rating-desc",
  page: 2,
};

describe("parseSearchFilters", () => {
  it("URL sem filtros vira os padrões", () => {
    expect(parse("")).toEqual(DEFAULT_FILTERS);
  });

  it("ignora os critérios da busca", () => {
    expect(parse("destination=Rio&checkIn=2026-12-12&rooms=1")).toEqual(DEFAULT_FILTERS);
  });

  it("lê todos os filtros", () => {
    expect(
      parse(
        "minPrice=200&maxPrice=1500&minRating=4.5&type=hotel&type=resort&amenity=wifi&amenity=pool&amenity=spa&sort=rating-desc&page=2",
      ),
    ).toEqual(FULL);
  });

  it("descarta cada valor inválido sozinho (critério 17)", () => {
    expect(parse("minRating=abc&page=-1&amenity=sauna&sort=x&minPrice=900&maxPrice=200")).toEqual({
      ...DEFAULT_FILTERS,
      minPrice: 200,
      maxPrice: 900,
    });
  });

  it("nota fora das opções fechadas é descartada", () => {
    expect(parse("minRating=3").minRating).toBeNull();
    expect(parse("minRating=5").minRating).toBeNull();
    expect(parse("minRating=").minRating).toBeNull();
    expect(parse("minRating=3.5").minRating).toBe(3.5);
    expect(parse("minRating=4.0").minRating).toBe(4);
  });

  it("preço: inteiro, limitado ao domínio; decimal e texto são descartados", () => {
    expect(parse("minPrice=-5").minPrice).toBe(0);
    expect(parse("minPrice=99999&maxPrice=99999")).toMatchObject({
      minPrice: 3000,
      maxPrice: 3000,
    });
    expect(parse("maxPrice=10.5").maxPrice).toBe(3000);
    expect(parse("maxPrice=abc").maxPrice).toBe(3000);
    expect(parse("minPrice=").minPrice).toBe(0);
  });

  it("mínimo maior que o máximo troca os valores", () => {
    expect(parse("minPrice=900&maxPrice=200")).toMatchObject({ minPrice: 200, maxPrice: 900 });
  });

  it("página: inteiro ≥ 1", () => {
    expect(parse("page=0").page).toBe(1);
    expect(parse("page=1.5").page).toBe(1);
    expect(parse("page=abc").page).toBe(1);
    expect(parse("page=7").page).toBe(7);
  });

  it("tipos e comodidades: dedupe e ordem do enum", () => {
    const filters = parse(
      "type=resort&type=hotel&type=resort&amenity=spa&amenity=wifi&amenity=spa",
    );
    expect(filters.types).toEqual(["hotel", "resort"]);
    expect(filters.amenities).toEqual(["wifi", "spa"]);
  });

  it("valor de enum inválido não derruba os válidos", () => {
    expect(parse("type=castelo&type=pousada").types).toEqual(["pousada"]);
  });
});

describe("serializeSearchFilters", () => {
  it("padrões viram query vazia", () => {
    expect(serializeSearchFilters(DEFAULT_FILTERS).toString()).toBe("");
  });

  it("ordem canônica e valores repetidos para listas", () => {
    expect(serializeSearchFilters(FULL).toString()).toBe(
      "minPrice=200&maxPrice=1500&minRating=4.5&type=hotel&type=resort&amenity=wifi&amenity=pool&amenity=spa&sort=rating-desc&page=2",
    );
  });

  it("omite 0, 3.000, popular e página 1", () => {
    const params = serializeSearchFilters({
      ...FULL,
      minPrice: 0,
      maxPrice: 3000,
      sort: "popular",
      page: 1,
    });
    expect(params.has("minPrice")).toBe(false);
    expect(params.has("maxPrice")).toBe(false);
    expect(params.has("sort")).toBe(false);
    expect(params.has("page")).toBe(false);
  });

  it("deduplica e ordena listas fora de ordem", () => {
    const params = serializeSearchFilters({
      ...DEFAULT_FILTERS,
      types: ["resort", "hotel", "resort"],
      amenities: ["spa", "wifi"],
    });
    expect(params.toString()).toBe("type=hotel&type=resort&amenity=wifi&amenity=spa");
  });

  it("round-trip: parse(serialize(x)) = x", () => {
    expect(parseSearchFilters(serializeSearchFilters(FULL))).toEqual(FULL);
    expect(parseSearchFilters(serializeSearchFilters(DEFAULT_FILTERS))).toEqual(DEFAULT_FILTERS);
  });

  it("round-trip canônico: serialize(parse(url)) normaliza a URL", () => {
    const messy = "page=1&type=resort&type=hotel&sort=popular&minPrice=0&amenity=sauna";
    expect(serializeSearchFilters(parse(messy)).toString()).toBe("type=hotel&type=resort");
  });
});

describe("withFilters", () => {
  const criteria =
    "destination=Rio+de+Janeiro%2C+RJ&checkIn=2026-12-12&checkOut=2026-12-15&rooms=1&adults=2&children=0";

  it("preserva os critérios como estão e troca só os filtros", () => {
    const current = new URLSearchParams(`${criteria}&minRating=4&type=hotel&page=3`);
    const next = withFilters(current, {
      ...DEFAULT_FILTERS,
      amenities: ["pool"],
      sort: "price-asc",
    });
    expect(next.toString()).toBe(`${criteria}&amenity=pool&sort=price-asc`);
  });

  it("preserva chaves desconhecidas que não são de filtro", () => {
    const next = withFilters(new URLSearchParams(`utm=x&${criteria}&page=2`), DEFAULT_FILTERS);
    expect(next.get("utm")).toBe("x");
    expect(next.has("page")).toBe(false);
    expect(next.get("destination")).toBe("Rio de Janeiro, RJ");
  });

  it("não muta os params recebidos", () => {
    const current = new URLSearchParams("page=2");
    withFilters(current, DEFAULT_FILTERS);
    expect(current.toString()).toBe("page=2");
  });
});

describe("countActiveFilters / hasActiveFilters", () => {
  it("padrões: zero", () => {
    expect(countActiveFilters(DEFAULT_FILTERS)).toBe(0);
    expect(hasActiveFilters(DEFAULT_FILTERS)).toBe(false);
  });

  it("ordenação e página não contam", () => {
    expect(countActiveFilters({ ...DEFAULT_FILTERS, sort: "price-asc", page: 3 })).toBe(0);
  });

  it("faixa de preço conta 1 (mínimo, máximo ou ambos)", () => {
    expect(countActiveFilters({ ...DEFAULT_FILTERS, minPrice: 100 })).toBe(1);
    expect(countActiveFilters({ ...DEFAULT_FILTERS, maxPrice: 500 })).toBe(1);
    expect(countActiveFilters({ ...DEFAULT_FILTERS, minPrice: 100, maxPrice: 500 })).toBe(1);
  });

  it("soma preço, nota, tipos e comodidades", () => {
    expect(countActiveFilters(FULL)).toBe(1 + 1 + 2 + 3);
    expect(hasActiveFilters(FULL)).toBe(true);
  });
});
