import { describe, expect, it } from "vitest";
import type { SearchCriteria } from "@/shared/lib/search-params";
import {
  addRecentSearch,
  describeRecentSearch,
  hasExpiredDates,
  MAX_RECENT,
  parseRecentSearches,
  parseRecentSearchesJson,
  restoreRecentSearch,
} from "./recent-searches";

const TODAY = "2026-12-10";
const make = (overrides: Partial<SearchCriteria> = {}): SearchCriteria => ({
  destination: "São Paulo, SP",
  checkIn: "2026-12-12",
  checkOut: "2026-12-15",
  rooms: 1,
  adults: 2,
  children: 0,
  ...overrides,
});

describe("addRecentSearch", () => {
  it("coloca a mais recente no topo", () => {
    const a = make();
    const b = make({ destination: "Gramado, RS" });
    expect(addRecentSearch([a], b)).toEqual([b, a]);
  });

  it("remove duplicata e sobe para o topo", () => {
    const a = make();
    const b = make({ destination: "Gramado, RS" });
    expect(addRecentSearch([b, a], make())).toEqual([a, b]);
  });

  it("corta em 5", () => {
    const list = Array.from({ length: MAX_RECENT }, (_, i) => make({ adults: i + 1, rooms: 1 }));
    const next = addRecentSearch(list, make({ destination: "Gramado, RS" }));
    expect(next).toHaveLength(MAX_RECENT);
    expect(next[0]?.destination).toBe("Gramado, RS");
    expect(next.at(-1)).toEqual(list[MAX_RECENT - 2]);
  });

  it("não muta a lista original", () => {
    const list = [make()];
    addRecentSearch(list, make({ destination: "Gramado, RS" }));
    expect(list).toHaveLength(1);
  });
});

describe("parseRecentSearches", () => {
  it("descarta itens corrompidos e mantém os válidos", () => {
    const valid = make();
    expect(
      parseRecentSearches([valid, null, "x", { destination: "" }, make({ rooms: 9 }), valid]),
    ).toEqual([valid, valid]);
  });

  it("limita a 5", () => {
    expect(parseRecentSearches(Array.from({ length: 8 }, () => make()))).toHaveLength(MAX_RECENT);
  });
});

describe("restoreRecentSearch", () => {
  it("check-in futuro ou hoje mantém tudo", () => {
    expect(restoreRecentSearch(make(), TODAY)).toEqual({ values: make(), datesExpired: false });
    const today = make({ checkIn: TODAY, checkOut: "2026-12-11" });
    expect(restoreRecentSearch(today, TODAY).datesExpired).toBe(false);
  });

  it("check-in passado esvazia só as datas", () => {
    const past = make({ checkIn: "2026-12-09", checkOut: "2026-12-12", adults: 3, children: 1 });
    expect(restoreRecentSearch(past, TODAY)).toEqual({
      values: {
        destination: "São Paulo, SP",
        checkIn: "",
        checkOut: "",
        rooms: 1,
        adults: 3,
        children: 1,
      },
      datesExpired: true,
    });
  });

  it("hasExpiredDates é estrito (hoje não expirou)", () => {
    expect(hasExpiredDates(make({ checkIn: TODAY }), TODAY)).toBe(false);
    expect(hasExpiredDates(make({ checkIn: "2026-12-09" }), TODAY)).toBe(true);
  });
});

describe("describeRecentSearch", () => {
  it("monta o resumo com singular e plural", () => {
    expect(describeRecentSearch(make(), TODAY, "pt-BR")).toBe(
      "São Paulo, SP · 12–15 dez · 2 adultos · 1 quarto",
    );
    expect(describeRecentSearch(make({ adults: 1, rooms: 1 }), TODAY, "pt-BR")).toContain(
      "1 adulto ·",
    );
  });

  it("inclui crianças só quando houver", () => {
    expect(describeRecentSearch(make({ children: 1 }), TODAY, "pt-BR")).toContain(
      "2 adultos, 1 criança ·",
    );
    expect(describeRecentSearch(make({ children: 3, rooms: 2 }), TODAY, "pt-BR")).toBe(
      "São Paulo, SP · 12–15 dez · 2 adultos, 3 crianças · 2 quartos",
    );
  });
});

describe("parseRecentSearchesJson", () => {
  it("lê o JSON salvo descartando itens inválidos", () => {
    const raw = JSON.stringify([make(), { lixo: true }, 42]);
    expect(parseRecentSearchesJson(raw)).toEqual([make()]);
  });

  it.each([null, "", "{not json", "{}", "42", "null"])("%j vira lista vazia", (raw) => {
    expect(parseRecentSearchesJson(raw)).toEqual([]);
  });
});
