import { describe, expect, it } from "vitest";
import { searchCriteriaSchema } from "@/shared/lib/search-params";
import {
  DEFAULT_SEARCH_FORM_VALUES,
  FORM_MESSAGES,
  makeSearchFormSchema,
  type SearchFormValues,
  toFormValues,
} from "./search-form.schema";

const TODAY = "2026-12-10";
const schema = makeSearchFormSchema(TODAY);
const valid: SearchFormValues = {
  destination: "São Paulo, SP",
  checkIn: "2026-12-12",
  checkOut: "2026-12-15",
  rooms: 1,
  adults: 2,
  children: 0,
};

const issues = (overrides: Partial<SearchFormValues>) => {
  const result = schema.safeParse({ ...valid, ...overrides });
  return result.success ? [] : result.error.issues.map((i) => [i.path[0], i.message]);
};

describe("makeSearchFormSchema", () => {
  it("aceita valores válidos e devolve os critérios", () => {
    expect(schema.parse(valid)).toEqual(valid);
  });

  it("exige destino", () => {
    expect(issues({ destination: "" })).toEqual([["destination", "Escolha um destino da lista."]]);
    expect(issues({ destination: "   " })).toEqual([
      ["destination", "Escolha um destino da lista."],
    ]);
  });

  it("exige as duas datas, sem mensagens duplicadas", () => {
    expect(issues({ checkIn: "", checkOut: "" })).toEqual([
      ["checkIn", FORM_MESSAGES.checkInRequired],
      ["checkOut", FORM_MESSAGES.checkOutRequired],
    ]);
  });

  it("rejeita data inexistente", () => {
    expect(issues({ checkIn: "2026-02-30" })).toEqual([["checkIn", "Escolha uma data válida."]]);
  });

  it("check-in ontem falha; hoje passa", () => {
    expect(issues({ checkIn: "2026-12-09", checkOut: "2026-12-12" })).toEqual([
      ["checkIn", FORM_MESSAGES.checkInPast],
    ]);
    expect(issues({ checkIn: TODAY, checkOut: "2026-12-12" })).toEqual([]);
  });

  it.each([
    ["0 noites", "2026-12-12", [["checkOut", expect.stringContaining("pelo menos 1 dia")]]],
    ["1 noite", "2026-12-13", []],
    ["30 noites", "2027-01-11", []],
    ["31 noites", "2027-01-12", [["checkOut", expect.stringContaining("no máximo 30 noites")]]],
  ])("%s", (_name, checkOut, expected) => {
    expect(issues({ checkOut })).toEqual(expected);
  });

  it("exige 1 adulto por quarto e no máximo 5 hóspedes por quarto", () => {
    expect(issues({ rooms: 2, adults: 1 })).toEqual([
      ["adults", "Inclua pelo menos 1 adulto por quarto."],
    ]);
    expect(issues({ adults: 5, children: 1 })).toEqual([
      ["children", expect.stringContaining("até 5 hóspedes")],
    ]);
  });

  it("rejeita limites fora da faixa", () => {
    expect(issues({ rooms: 5, adults: 16 }).map(([path]) => path)).toContain("rooms");
    expect(issues({ adults: 17, rooms: 4 }).map(([path]) => path)).toContain("adults");
    expect(issues({ children: 11, rooms: 4 }).map(([path]) => path)).toContain("children");
    expect(issues({ adults: 1.5 }).map(([path]) => path)).toContain("adults");
  });

  it("paridade: toda saída válida do formulário passa no schema da URL", () => {
    const destinations = ["São Paulo, SP", "Gramado, RS"];
    for (const destination of destinations) {
      for (const [rooms, adults, children] of [
        [1, 2, 0],
        [2, 2, 3],
        [4, 16, 4],
      ] as const) {
        const parsed = schema.parse({ ...valid, destination, rooms, adults, children });
        expect(searchCriteriaSchema.safeParse(parsed).success).toBe(true);
      }
    }
  });

  it("paridade inversa: o que o schema da URL recusa nas regras cruzadas o formulário também recusa", () => {
    const bad = { ...valid, checkOut: "2027-03-01" };
    expect(searchCriteriaSchema.safeParse(bad).success).toBe(false);
    expect(schema.safeParse(bad).success).toBe(false);
  });
});

describe("toFormValues / defaults", () => {
  it("copia os critérios", () => {
    expect(toFormValues(valid)).toEqual(valid);
  });

  it("defaults: sem destino nem datas, 2 adultos em 1 quarto", () => {
    expect(DEFAULT_SEARCH_FORM_VALUES).toEqual({
      destination: "",
      checkIn: "",
      checkOut: "",
      rooms: 1,
      adults: 2,
      children: 0,
    });
  });
});

describe("mensagens com check-in/check-out", () => {
  it("usam hífen não separável (U+2011) para não quebrar a palavra no mobile", () => {
    for (const message of [FORM_MESSAGES.checkInRequired, FORM_MESSAGES.checkOutRequired]) {
      expect(message).toMatch(/check‑(in|out)/);
      expect(message).not.toMatch(/check-(in|out)/);
    }
  });
});
