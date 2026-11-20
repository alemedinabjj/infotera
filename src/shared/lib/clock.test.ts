import { describe, expect, it } from "vitest";
import { formatClockTime } from "./clock";

describe("formatClockTime", () => {
  it("pt-BR mantém 24 h", () => {
    expect(formatClockTime("15:00", "pt-BR")).toBe("15:00");
  });

  it.each([
    ["15:00", "3:00 PM"],
    ["12:00", "12:00 PM"],
    ["00:30", "12:30 AM"],
    ["09:05", "9:05 AM"],
  ])("en-US converte %s para %s", (input, expected) => {
    expect(formatClockTime(input, "en-US")).toBe(expected);
  });

  it("valor fora do padrão passa intacto", () => {
    expect(formatClockTime("tarde", "en-US")).toBe("tarde");
  });
});
