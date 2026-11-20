import { describe, expect, it } from "vitest";
import { isValidPassport, maskPassport, normalizePassport } from "./passport";

describe("isValidPassport", () => {
  it.each(["FZ123456", "fz 123 456", "A1B2C3", "123456789", "AB1234567"])("aceita %s", (value) => {
    expect(isValidPassport(value)).toBe(true);
  });

  it.each([
    ["ABC", "curto"],
    ["ABCDEFGH", "sem dígito"],
    ["1234567890", "longo"],
    ["111111", "todos iguais"],
    ["AAAAAA", "todos iguais"],
    ["", "vazio"],
  ])("rejeita %j (%s)", (value) => {
    expect(isValidPassport(value)).toBe(false);
  });
});

describe("normalizePassport / maskPassport", () => {
  it("maiúsculas e sem espaços ou símbolos", () => {
    expect(normalizePassport(" fz-123 456 ")).toBe("FZ123456");
  });

  it("mostra só os 3 últimos", () => {
    expect(maskPassport("FZ123456")).toBe("******456");
    expect(maskPassport("AB1234567")).toBe("******567");
  });
});
