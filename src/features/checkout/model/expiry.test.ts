import { describe, expect, it } from "vitest";
import { expiryIssue, formatExpiry, isExpiryValid, parseExpiry } from "./expiry";

const TODAY = "2026-11-19";

describe("formatExpiry", () => {
  it("coloca a barra depois do 2º dígito", () => {
    expect(formatExpiry("1")).toBe("1");
    expect(formatExpiry("12")).toBe("12");
    expect(formatExpiry("122")).toBe("12/2");
    expect(formatExpiry("1228")).toBe("12/28");
    expect(formatExpiry("12/28999")).toBe("12/28");
  });
});

describe("parseExpiry", () => {
  it("lê MM/AA", () => {
    expect(parseExpiry("12/28")).toEqual({ month: 12, year: 2028 });
    expect(parseExpiry("1228")).toBeNull();
  });
});

describe("expiryIssue", () => {
  it.each([
    ["11/26", null], // mês atual vale
    ["12/26", null],
    ["10/26", "expired"], // mês passado
    ["01/20", "expired"],
    ["13/30", "month"],
    ["00/30", "month"],
    ["11/46", null], // exatamente 20 anos
    ["12/46", "year"], // +20 anos e 1 mês
    ["11/47", "year"], // +21 anos
    ["1/30", "format"],
    ["", "format"],
  ])("%s → %s", (value, issue) => {
    expect(expiryIssue(value, TODAY)).toBe(issue);
  });

  it("virada de ano: em janeiro, dezembro do ano anterior venceu", () => {
    expect(isExpiryValid("12/26", "2027-01-05")).toBe(false);
    expect(isExpiryValid("01/27", "2027-01-31")).toBe(true);
  });
});
