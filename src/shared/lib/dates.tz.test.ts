// Fixa o fuso antes de qualquer Date ser criado neste arquivo (Node relê TZ ao ser alterado).
process.env.TZ = "America/Sao_Paulo";

import { describe, expect, it } from "vitest";
import { addDays, formatDate, nightsBetween, toISODate } from "./dates";

describe("datas em America/Sao_Paulo (UTC-3)", () => {
  it("formatDate não volta um dia", () => {
    expect(formatDate("2026-12-01", "short", "pt-BR")).toBe("01/12/2026");
  });

  it("nightsBetween e addDays seguem estáveis", () => {
    expect(nightsBetween("2026-03-07", "2026-03-08")).toBe(1);
    expect(addDays("2026-02-28", 1)).toBe("2026-03-01");
  });

  it("toISODate usa a data local do usuário", () => {
    expect(toISODate(new Date(2026, 0, 5, 23, 30))).toBe("2026-01-05");
  });
});
