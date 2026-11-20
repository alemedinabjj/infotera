import { describe, expect, it } from "vitest";
import { makeSearchCriteria } from "@/shared/testing/fixtures";
import {
  describeSearchSummary,
  parseSearchPage,
  searchPageDestination,
  searchPageKey,
  searchPageTitle,
} from "./search-page";

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

describe("searchPageTitle / searchPageDestination", () => {
  const stay = parseSearchPage(new URLSearchParams(CRITERIA));
  const browse = parseSearchPage(new URLSearchParams("destination=Bonito%2C+MS"));
  const missing = parseSearchPage(new URLSearchParams(""));

  it("título por modo", () => {
    expect(searchPageTitle(stay, "pt-BR")).toBe("Hotéis em Rio de Janeiro, RJ | Infotera Hotéis");
    expect(searchPageTitle(browse, "pt-BR")).toBe("Hotéis em Bonito, MS | Infotera Hotéis");
    expect(searchPageTitle(missing, "pt-BR")).toBe("Buscar hotéis | Infotera Hotéis");
  });

  it("destino por modo", () => {
    expect(searchPageDestination(stay)).toBe("Rio de Janeiro, RJ");
    expect(searchPageDestination(browse)).toBe("Bonito, MS");
    expect(searchPageDestination(missing)).toBeNull();
  });
});

describe("describeSearchSummary", () => {
  const stay = makeSearchCriteria({ checkIn: "2026-12-12", checkOut: "2026-12-15" });

  it("stay: datas, noites e hóspedes", () => {
    expect(describeSearchSummary(stay, "2026-11-01", "pt-BR")).toBe(
      "12–15 dez · 3 noites · 2 adultos · 1 quarto",
    );
  });

  it("crianças e vários quartos", () => {
    expect(
      describeSearchSummary({ ...stay, rooms: 2, adults: 3, children: 1 }, "2026-11-01", "pt-BR"),
    ).toBe("12–15 dez · 3 noites · 3 adultos, 1 criança · 2 quartos");
  });

  it("1 noite no singular e ano quando a estadia é em outro ano", () => {
    const summary = describeSearchSummary(
      { ...stay, checkIn: "2027-01-10", checkOut: "2027-01-11" },
      "2026-11-01",
      "pt-BR",
    );
    expect(summary).toContain("1 noite");
    expect(summary).toContain("2027");
  });

  it("browse: datas não definidas", () => {
    expect(describeSearchSummary(null, "2026-11-01", "pt-BR")).toBe("Datas não definidas");
  });
});

describe("searchPageKey", () => {
  it("muda com os critérios e ignora filtros", () => {
    const a = parseSearchPage(new URLSearchParams(CRITERIA));
    const b = parseSearchPage(new URLSearchParams(`${CRITERIA}&minRating=4&page=2`));
    const c = parseSearchPage(new URLSearchParams(CRITERIA.replace("adults=2", "adults=3")));
    expect(searchPageKey(a)).toBe(searchPageKey(b));
    expect(searchPageKey(a)).not.toBe(searchPageKey(c));
    expect(searchPageKey(parseSearchPage(new URLSearchParams("destination=Bonito")))).toBe(
      "browse:Bonito",
    );
    expect(searchPageKey(parseSearchPage(new URLSearchParams("")))).toBe("missing");
  });
});
