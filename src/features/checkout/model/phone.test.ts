import { describe, expect, it } from "vitest";
import {
  BR_AREA_CODES,
  formatInternational,
  formatPhone,
  isValidPhone,
  type PhoneCountry,
  phoneDigits,
  toE164,
} from "./phone";

describe("isValidPhone", () => {
  it.each<[PhoneCountry, string]>([
    ["BR", "(11) 98765-4321"],
    ["BR", "1134567890"],
    ["BR", "(21) 2345-6789"],
    ["US", "(201) 555-0123"],
    ["PT", "912 345 678"],
    ["PT", "212345678"],
    ["ES", "612 34 56 78"],
    ["ES", "912345678"],
  ])("%s aceita %s", (country, value) => {
    expect(isValidPhone(country, value)).toEqual({ ok: true });
  });

  it.each([
    ["BR", "(20) 98765-4321", "area-code"],
    ["BR", "119876543210", "length"],
    ["BR", "119876543", "length"],
    ["BR", "(11) 88765-4321", "mobile-nine"], // celular sem o 9
    ["BR", "(11) 8765-4321", "mobile-nine"],
    ["BR", "(11) 1234-5678", "pattern"],
    ["US", "(101) 555-0123", "area-code"],
    ["US", "(911) 555-0123", "area-code"], // N11
    ["US", "(201) 155-0123", "pattern"],
    ["US", "201555012", "length"],
    ["PT", "812 345 678", "pattern"],
    ["PT", "91234567", "length"],
    ["ES", "512 34 56 78", "pattern"],
    ["ES", "6123456789", "length"],
  ] as const)("%s rejeita %s (%s)", (country, value, reason) => {
    expect(isValidPhone(country, value)).toMatchObject({ ok: false, reason });
  });

  it("informa o DDD inexistente", () => {
    expect(isValidPhone("BR", "20987654321")).toEqual({
      ok: false,
      reason: "area-code",
      areaCode: "20",
    });
  });

  it("a tabela de DDDs tem 67 códigos e não tem 20", () => {
    expect(BR_AREA_CODES.size).toBe(67);
    expect(BR_AREA_CODES.has("20")).toBe(false);
  });
});

describe("formatPhone", () => {
  it.each<[PhoneCountry, string, string]>([
    ["BR", "", ""],
    ["BR", "1", "(1"],
    ["BR", "11", "(11"],
    ["BR", "119", "(11) 9"],
    ["BR", "1198765", "(11) 9876-5"],
    ["BR", "11987654", "(11) 9876-54"],
    ["BR", "1134567890", "(11) 3456-7890"],
    ["BR", "11987654321", "(11) 98765-4321"],
    ["BR", "119876543219999", "(11) 98765-4321"],
    ["US", "2015550123", "(201) 555-0123"],
    ["US", "2015", "(201) 5"],
    ["PT", "912345678", "912 345 678"],
    ["ES", "612345678", "612 34 56 78"],
    ["ES", "61", "61"],
  ])("%s %s → %s", (country, raw, expected) => {
    expect(formatPhone(country, raw)).toBe(expected);
  });

  it("reaplica a máscara de outro país aos mesmos dígitos", () => {
    const digits = phoneDigits("BR", "(11) 98765-4321");
    expect(formatPhone("US", digits)).toBe("(119) 876-5432");
    expect(phoneDigits("US", digits)).toBe("1198765432");
  });
});

describe("toE164 / formatInternational", () => {
  it("monta o número internacional", () => {
    expect(toE164("BR", "(11) 98765-4321")).toBe("+5511987654321");
    expect(toE164("US", "(201) 555-0123")).toBe("+12015550123");
    expect(toE164("PT", "912 345 678")).toBe("+351912345678");
    expect(toE164("ES", "612 34 56 78")).toBe("+34612345678");
    expect(formatInternational("BR", "11987654321")).toBe("+55 (11) 98765-4321");
  });
});
