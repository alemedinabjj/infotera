// Servidor em UTC (como no Render): "hoje" ainda assim é o de Brasília.
process.env.TZ = "UTC";

import { afterEach, describe, expect, it, vi } from "vitest";
import { todayISO } from "./dates";

describe("todayISO com o servidor em UTC", () => {
  afterEach(() => vi.useRealTimers());

  it("às 23:30 de Brasília ainda é o mesmo dia", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-20T02:30:00Z")); // 23:30 em Brasília (UTC-3)
    expect(todayISO()).toBe("2026-11-19");
  });

  it("à meia-noite de Brasília vira o dia", () => {
    expect(todayISO(new Date("2026-11-20T03:00:00Z"))).toBe("2026-11-20");
  });
});
