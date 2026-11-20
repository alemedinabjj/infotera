import { describe, expect, it } from "vitest";
import {
  guestsPerRoom,
  parseSearchCriteria,
  SEARCH_PARAM_KEYS,
  type SearchCriteria,
  searchCriteriaToQueryString,
  serializeSearchCriteria,
} from "./search-params";

const valid = {
  destination: "São Paulo, SP",
  checkIn: "2026-12-10",
  checkOut: "2026-12-13",
  rooms: "1",
  adults: "2",
  children: "1",
};

const parse = (overrides: Record<string, string>) =>
  parseSearchCriteria(new URLSearchParams({ ...valid, ...overrides }));

const failedPaths = (overrides: Record<string, string>): string[] => {
  const result = parse(overrides);
  return result.success ? [] : result.issues.map((issue) => issue.path);
};

describe("parseSearchCriteria", () => {
  it("aceita params válidos e coage números", () => {
    const result = parse({});
    expect(result).toEqual({
      success: true,
      data: {
        destination: "São Paulo, SP",
        checkIn: "2026-12-10",
        checkOut: "2026-12-13",
        rooms: 1,
        adults: 2,
        children: 1,
      },
    });
  });

  it.each([
    ["rooms=abc", { rooms: "abc" }, "rooms"],
    ["rooms=5", { rooms: "5" }, "rooms"],
    ["rooms=0", { rooms: "0" }, "rooms"],
    ["adults=1.5", { adults: "1.5" }, "adults"],
    ["children=11", { children: "11" }, "children"],
    ["checkOut igual ao checkIn", { checkOut: "2026-12-10" }, "checkOut"],
    ["checkOut antes do checkIn", { checkOut: "2026-12-01" }, "checkOut"],
    ["31 noites", { checkOut: "2027-01-10" }, "checkOut"],
    ["adults < rooms", { rooms: "3", adults: "2", children: "0" }, "adults"],
    ["hóspedes > rooms x 5", { rooms: "1", adults: "5", children: "1" }, "children"],
    ["destination vazio", { destination: "" }, "destination"],
    ["destination só espaços", { destination: "   " }, "destination"],
    ["checkIn inválido", { checkIn: "2026-02-30" }, "checkIn"],
    ["checkOut mal formatado", { checkOut: "13/12/2026" }, "checkOut"],
  ])("rejeita %s apontando o campo", (_name, overrides, path) => {
    expect(failedPaths(overrides)).toContain(path);
  });

  it("aceita exatamente 30 noites e o limite de hóspedes por quarto", () => {
    expect(parse({ checkOut: "2027-01-09" }).success).toBe(true);
    expect(parse({ rooms: "1", adults: "5", children: "0" }).success).toBe(true);
  });

  it("reporta campos ausentes", () => {
    const result = parseSearchCriteria(new URLSearchParams());
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.issues.map((issue) => issue.path)).toEqual(
        expect.arrayContaining([...SEARCH_PARAM_KEYS]),
      );
    }
  });

  it("aceita o objeto do Next com array (primeiro valor) e ignora chaves extras", () => {
    const result = parseSearchCriteria({
      ...valid,
      adults: ["2", "3"],
      children: undefined,
      sort: "price",
      minRating: "4",
    });
    expect(result.success).toBe(false);
    const ok = parseSearchCriteria({ ...valid, adults: ["2", "3"], sort: "price" });
    expect(ok.success && ok.data.adults).toBe(2);
  });

  it("faz trim do destino e preserva acentos e caixa", () => {
    const result = parse({ destination: "  Florianópolis, SC " });
    expect(result.success && result.data.destination).toBe("Florianópolis, SC");
  });

  it("rejeita destino com mais de 100 caracteres", () => {
    expect(failedPaths({ destination: "a".repeat(101) })).toContain("destination");
  });
});

describe("serializeSearchCriteria", () => {
  const criteria: SearchCriteria = {
    destination: "São Paulo, SP",
    checkIn: "2026-12-10",
    checkOut: "2026-12-13",
    rooms: 2,
    adults: 3,
    children: 1,
  };

  it("mantém a ordem de SEARCH_PARAM_KEYS", () => {
    expect([...serializeSearchCriteria(criteria).keys()]).toEqual([...SEARCH_PARAM_KEYS]);
  });

  it("faz round-trip preservando acentos, vírgula e espaço", () => {
    const query = searchCriteriaToQueryString(criteria);
    expect(query.startsWith("?")).toBe(false);
    const result = parseSearchCriteria(new URLSearchParams(query));
    expect(result.success && result.data).toEqual(criteria);
  });
});

describe("guestsPerRoom", () => {
  it("arredonda para cima", () => {
    expect(guestsPerRoom({ adults: 3, children: 1, rooms: 3 })).toBe(2);
    expect(guestsPerRoom({ adults: 2, children: 1, rooms: 1 })).toBe(3);
  });
});
