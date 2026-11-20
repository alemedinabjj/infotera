import { describe, expect, it } from "vitest";
import { makeSearchCriteria } from "../testing/fixtures";
import { describeStay } from "./stay-summary";

describe("describeStay", () => {
  it("período, noites e hóspedes", () => {
    const criteria = makeSearchCriteria({ checkIn: "2026-12-12", checkOut: "2026-12-15" });
    expect(describeStay(criteria, "2026-11-01", "pt-BR")).toBe(
      "12–15 dez · 3 noites · 2 adultos · 1 quarto",
    );
  });

  it("mostra o ano quando a estadia não é no ano corrente", () => {
    const criteria = makeSearchCriteria({ checkIn: "2027-01-02", checkOut: "2027-01-03" });
    expect(describeStay(criteria, "2026-12-20", "pt-BR")).toBe(
      "2–3 jan 2027 · 1 noite · 2 adultos · 1 quarto",
    );
  });
});
