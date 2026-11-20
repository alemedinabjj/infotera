import { describe, expect, it } from "vitest";
import { applyFilterChange, type FilterChange } from "./filter-change";
import { DEFAULT_FILTERS, type SearchFilters } from "./search-filters";

const ON_PAGE_3: SearchFilters = {
  ...DEFAULT_FILTERS,
  minPrice: 100,
  maxPrice: 900,
  minRating: 4,
  types: ["hotel"],
  amenities: ["pool"],
  sort: "price-asc",
  view: "infinite",
  page: 3,
};

describe("applyFilterChange", () => {
  it("setPrice troca a faixa", () => {
    expect(
      applyFilterChange(DEFAULT_FILTERS, { type: "setPrice", min: 200, max: 500 }),
    ).toMatchObject({
      minPrice: 200,
      maxPrice: 500,
    });
  });

  it("setRating define e remove", () => {
    expect(applyFilterChange(DEFAULT_FILTERS, { type: "setRating", value: 4.5 }).minRating).toBe(
      4.5,
    );
    expect(applyFilterChange(ON_PAGE_3, { type: "setRating", value: null }).minRating).toBeNull();
  });

  it("toggleType liga e desliga", () => {
    const on = applyFilterChange(DEFAULT_FILTERS, { type: "toggleType", value: "pousada" });
    expect(on.types).toEqual(["pousada"]);
    expect(applyFilterChange(on, { type: "toggleType", value: "pousada" }).types).toEqual([]);
  });

  it("toggleAmenity liga e desliga sem mexer nas outras", () => {
    const on = applyFilterChange(ON_PAGE_3, { type: "toggleAmenity", value: "spa" });
    expect(on.amenities).toEqual(["pool", "spa"]);
    expect(applyFilterChange(on, { type: "toggleAmenity", value: "pool" }).amenities).toEqual([
      "spa",
    ]);
  });

  it("setSort troca a ordenação", () => {
    expect(applyFilterChange(DEFAULT_FILTERS, { type: "setSort", value: "rating-desc" }).sort).toBe(
      "rating-desc",
    );
  });

  it("setView troca o modo de exibição", () => {
    expect(applyFilterChange(DEFAULT_FILTERS, { type: "setView", value: "infinite" }).view).toBe(
      "infinite",
    );
  });

  it("clear zera preço, nota, tipos e comodidades e mantém ordenação e modo", () => {
    expect(applyFilterChange(ON_PAGE_3, { type: "clear" })).toEqual({
      ...DEFAULT_FILTERS,
      sort: "price-asc",
      view: "infinite",
    });
  });

  it.each<FilterChange>([
    { type: "setPrice", min: 0, max: 100 },
    { type: "setRating", value: 3.5 },
    { type: "toggleType", value: "resort" },
    { type: "toggleAmenity", value: "wifi" },
    { type: "setSort", value: "popular" },
    { type: "setView", value: "pages" },
    { type: "clear" },
  ])("toda ação volta para a página 1 ($type)", (change) => {
    expect(applyFilterChange(ON_PAGE_3, change).page).toBe(1);
  });

  it("não muta o estado anterior", () => {
    applyFilterChange(ON_PAGE_3, { type: "toggleAmenity", value: "spa" });
    expect(ON_PAGE_3.amenities).toEqual(["pool"]);
    expect(ON_PAGE_3.page).toBe(3);
  });
});
