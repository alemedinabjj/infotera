import { describe, expect, it } from "vitest";
import { guestHints } from "../model/guests";
import { makeSearchFormSchema } from "../model/search-form.schema";
import { describeResultCount } from "../model/suggestion-text";
import { searchFormMessages } from "./messages";

const VALID = {
  destination: "Rio de Janeiro, RJ",
  checkIn: "2026-12-10",
  checkOut: "2026-12-13",
  rooms: 1,
  adults: 2,
  children: 0,
};

const messagesFor = (locale: "pt-BR" | "en-US", values: Partial<typeof VALID>) => {
  const result = makeSearchFormSchema("2026-11-20", locale).safeParse({ ...VALID, ...values });
  return result.success ? [] : result.error.issues.map((issue) => issue.message);
};

describe("formulário de busca por idioma", () => {
  it("validação em inglês (inclusive o máximo de noites interpolado)", () => {
    expect(messagesFor("en-US", { destination: "" })).toContain(
      "Choose a destination from the list.",
    );
    expect(messagesFor("en-US", { checkIn: "" })).toContain("Choose the check‑in date.");
    expect(messagesFor("en-US", { checkIn: "2026-11-01", checkOut: "2026-11-05" })).toContain(
      "Choose a date from today onward.",
    );
    expect(messagesFor("en-US", { checkOut: "2027-03-01" })).toContain(
      "The stay can be at most 30 nights.",
    );
    expect(messagesFor("pt-BR", { checkOut: "2027-03-01" })).toContain(
      "A estadia pode ter no máximo 30 noites.",
    );
  });

  it("dicas de hóspedes e contagem de sugestões em inglês", () => {
    expect(guestHints({ rooms: 1, adults: 1, children: 0 }, null, "en-US").rooms).toBe(
      "Each room needs at least 1 adult. Add an adult to include more rooms.",
    );
    expect(describeResultCount(3, "rio", "en-US")).toBe("3 destinations found");
    expect(describeResultCount(0, " xyz ", "en-US")).toBe('No destination found for "xyz"');
  });

  it("os dois idiomas têm as mesmas chaves (compilação) e textos diferentes", () => {
    expect(searchFormMessages.get("en-US").form.submit).toBe("Search hotels");
    expect(searchFormMessages.get("pt-BR").form.submit).toBe("Buscar hotéis");
  });
});
