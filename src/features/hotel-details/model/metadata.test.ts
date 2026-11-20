import { describe, expect, it } from "vitest";
import { hotelPageTitle } from "./metadata";

describe("hotelPageTitle", () => {
  it("usa o nome do hotel", () => {
    expect(hotelPageTitle({ kind: "found", name: "Hotel Copacabana Palace" }, "pt-BR")).toBe(
      "Hotel Copacabana Palace | Infotera Hotéis",
    );
  });

  it("404 e erro têm títulos próprios", () => {
    expect(hotelPageTitle({ kind: "not-found" }, "pt-BR")).toBe(
      "Hotel não encontrado | Infotera Hotéis",
    );
    expect(hotelPageTitle({ kind: "error" }, "pt-BR")).toBe("Hotel | Infotera Hotéis");
  });
});
