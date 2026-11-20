import { describe, expect, it } from "vitest";
import { formatBookedAt } from "./booked-at";

describe("formatBookedAt", () => {
  it("converte UTC para o horário de Brasília", () => {
    expect(formatBookedAt("2026-11-19T15:04:00.000Z")).toBe("19/11/2026, 12:04");
  });

  it("vira o dia quando o horário de Brasília é do dia anterior", () => {
    expect(formatBookedAt("2026-11-19T01:30:00.000Z")).toBe("18/11/2026, 22:30");
  });

  it("aceita offset explícito", () => {
    expect(formatBookedAt("2026-11-19T12:04:00-03:00")).toBe("19/11/2026, 12:04");
  });

  it("meia-noite sai como 00:xx, não 24:xx", () => {
    expect(formatBookedAt("2026-11-19T03:05:00.000Z")).toBe("19/11/2026, 00:05");
  });
});
