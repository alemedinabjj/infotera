import { describe, expect, it } from "vitest";
import { defineMessages, plural } from "./messages";

describe("defineMessages", () => {
  it("devolve o dicionário do locale pedido", () => {
    const messages = defineMessages({
      "pt-BR": { title: "Olá", count: ({ n }: { n: number }) => `${n} noites` },
      "en-US": { title: "Hello", count: ({ n }: { n: number }) => `${n} nights` },
    });
    expect(messages.get("pt-BR").title).toBe("Olá");
    expect(messages.get("en-US").title).toBe("Hello");
    expect(messages.get("en-US").count({ n: 2 })).toBe("2 nights");
  });

  it("exige os dois locales com o mesmo formato (checado na compilação)", () => {
    // @ts-expect-error falta o locale en-US
    defineMessages({ "pt-BR": { title: "Olá" } });
    // @ts-expect-error chave diferente no en-US
    defineMessages<{ title: string }>({ "pt-BR": { title: "Olá" }, "en-US": { heading: "Hello" } });
  });
});

describe("plural", () => {
  it.each([
    [0, "noites"],
    [1, "noite"],
    [2, "noites"],
    [11, "noites"],
  ])("%i → %s", (count, expected) => {
    expect(plural(count, { one: "noite", other: "noites" })).toBe(expected);
  });
});
