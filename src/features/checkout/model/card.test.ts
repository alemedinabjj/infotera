import { describe, expect, it } from "vitest";
import { cardLast4, cvvLength, detectCardBrand, formatCardNumber, isValidLuhn } from "./card";

describe("isValidLuhn", () => {
  it.each([
    ["visa", "4111 1111 1111 1111"],
    ["master", "5555 5555 5555 4444"],
    ["amex", "3782 822463 10005"],
    ["elo", "6362 9700 0045 7013"],
    ["visa 13", "4222222222222"],
  ])("aceita %s", (_name, number) => {
    expect(isValidLuhn(number)).toBe(true);
  });

  it("rejeita o número alterado em 1 dígito", () => {
    expect(isValidLuhn("4111 1111 1111 1112")).toBe(false);
    expect(isValidLuhn("5555 5555 5555 4445")).toBe(false);
  });

  it("rejeita tamanho fora de 13–19 dígitos", () => {
    expect(isValidLuhn("411111111111")).toBe(false);
    expect(isValidLuhn("41111111111111111111")).toBe(false);
    expect(isValidLuhn("")).toBe(false);
  });
});

describe("detectCardBrand", () => {
  it.each([
    ["4111111111111111", "visa"],
    ["5555555555554444", "mastercard"],
    ["2221000000000009", "mastercard"],
    ["378282246310005", "amex"],
    ["341111111111111", "amex"],
    ["6062825624254001", "hipercard"],
    ["4011781234567890", "elo"], // colide com visa (4011)
    ["6362970000457013", "elo"],
    ["5067001234567890", "elo"], // colide com o prefixo 5
    ["9999999999999999", null],
    ["", null],
  ])("%s → %s", (number, brand) => {
    expect(detectCardBrand(number)).toBe(brand);
  });
});

describe("cvvLength / formatCardNumber / cardLast4", () => {
  it("amex tem 4, o resto 3", () => {
    expect(cvvLength("amex")).toBe(4);
    expect(cvvLength("visa")).toBe(3);
    expect(cvvLength(null)).toBe(3);
  });

  it("agrupa de 4 em 4 e Amex em 4-6-5", () => {
    expect(formatCardNumber("4111111111111111")).toBe("4111 1111 1111 1111");
    expect(formatCardNumber("4111-1111-1111-1111")).toBe("4111 1111 1111 1111");
    expect(formatCardNumber("378282246310005")).toBe("3782 822463 10005");
  });

  it("últimos 4 dígitos", () => {
    expect(cardLast4("4111 1111 1111 1111")).toBe("1111");
  });
});
