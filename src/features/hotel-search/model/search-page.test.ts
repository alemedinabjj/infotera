import { describe, expect, it } from "vitest";
import { makeSearchCriteria } from "@/shared/testing/fixtures";
import { hotelHref, parseSearchPage, searchPageDestination, searchPageTitle } from "./search-page";

const CRITERIA =
  "destination=Rio+de+Janeiro%2C+RJ&checkIn=2026-12-12&checkOut=2026-12-15&rooms=1&adults=2&children=0";

describe("parseSearchPage", () => {
  it("sem destino: missing-destination", () => {
    expect(parseSearchPage(new URLSearchParams(""))).toEqual({ kind: "missing-destination" });
    expect(parseSearchPage(new URLSearchParams("destination=%20%20"))).toEqual({
      kind: "missing-destination",
    });
    expect(parseSearchPage({ checkIn: "2026-12-12" })).toEqual({ kind: "missing-destination" });
  });

  it("destino sem datas: browse", () => {
    expect(parseSearchPage(new URLSearchParams("destination=Bonito%2C+MS"))).toEqual({
      kind: "browse",
      destination: "Bonito, MS",
    });
  });

  it("datas inválidas ou hóspedes inválidos: browse", () => {
    const page = parseSearchPage(
      new URLSearchParams(CRITERIA.replace("checkOut=2026-12-15", "checkOut=2026-12-10")),
    );
    expect(page.kind).toBe("browse");
    expect(
      parseSearchPage(new URLSearchParams(CRITERIA.replace("adults=2", "adults=0"))).kind,
    ).toBe("browse");
  });

  it("critérios completos: stay", () => {
    expect(parseSearchPage(new URLSearchParams(CRITERIA))).toEqual({
      kind: "stay",
      criteria: makeSearchCriteria({ checkIn: "2026-12-12", checkOut: "2026-12-15" }),
    });
  });

  it("filtros na URL não interferem no modo", () => {
    expect(parseSearchPage(new URLSearchParams(`${CRITERIA}&minRating=abc&page=-1`)).kind).toBe(
      "stay",
    );
  });

  it("aceita o searchParams do Next (objeto, array usa o primeiro)", () => {
    expect(parseSearchPage({ destination: ["Gramado, RS", "x"] })).toEqual({
      kind: "browse",
      destination: "Gramado, RS",
    });
  });
});

describe("hotelHref", () => {
  it("stay: critérios na ordem da F1", () => {
    expect(
      hotelHref(13, makeSearchCriteria({ checkIn: "2026-12-12", checkOut: "2026-12-15" })),
    ).toBe(`/hotel/13?${CRITERIA}`);
  });

  it("browse: sem critérios", () => {
    expect(hotelHref(13, null)).toBe("/hotel/13");
  });
});

describe("searchPageTitle / searchPageDestination", () => {
  const stay = parseSearchPage(new URLSearchParams(CRITERIA));
  const browse = parseSearchPage(new URLSearchParams("destination=Bonito%2C+MS"));
  const missing = parseSearchPage(new URLSearchParams(""));

  it("título por modo", () => {
    expect(searchPageTitle(stay)).toBe("Hotéis em Rio de Janeiro, RJ | Infotera Hotéis");
    expect(searchPageTitle(browse)).toBe("Hotéis em Bonito, MS | Infotera Hotéis");
    expect(searchPageTitle(missing)).toBe("Buscar hotéis | Infotera Hotéis");
  });

  it("destino por modo", () => {
    expect(searchPageDestination(stay)).toBe("Rio de Janeiro, RJ");
    expect(searchPageDestination(browse)).toBe("Bonito, MS");
    expect(searchPageDestination(missing)).toBeNull();
  });
});
