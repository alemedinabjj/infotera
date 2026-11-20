import { describe, expect, it } from "vitest";
import { stayStatus, stayStatusLabel } from "./stay-status";

describe("stayStatus (12 a 15 de dezembro)", () => {
  it.each([
    ["2026-12-11", "upcoming"],
    ["2026-12-12", "ongoing"],
    ["2026-12-14", "ongoing"],
    ["2026-12-15", "completed"],
    ["2026-12-16", "completed"],
  ] as const)("hoje %s -> %s", (today, expected) => {
    expect(stayStatus("2026-12-12", "2026-12-15", today)).toBe(expected);
  });
});

describe("stayStatusLabel", () => {
  it("textos do produto", () => {
    expect(stayStatusLabel("upcoming").label).toBe("Próxima estadia");
    expect(stayStatusLabel("ongoing").label).toBe("Em andamento");
    expect(stayStatusLabel("completed").label).toBe("Concluída");
  });
});
