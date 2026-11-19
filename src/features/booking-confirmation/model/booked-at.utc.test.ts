// Servidor em UTC (como na Vercel): a hora de Brasília continua certa.
process.env.TZ = "UTC";

import { describe, expect, it } from "vitest";
import { formatBookedAt } from "./booked-at";

describe("formatBookedAt com o processo em UTC", () => {
  it("o fuso do processo não muda a hora de Brasília", () => {
    expect(new Date(2026, 10, 19, 12, 0).getTimezoneOffset()).toBe(0);
    expect(formatBookedAt("2026-11-19T15:04:00.000Z")).toBe("19/11/2026, 12:04");
  });
});
