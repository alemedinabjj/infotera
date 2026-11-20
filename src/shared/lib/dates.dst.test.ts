process.env.TZ = "America/New_York";

import { describe, expect, it } from "vitest";
import { addDays, formatDate, nightsBetween } from "./dates";

describe("datas em America/New_York (DST em 2026-03-08)", () => {
  it("nightsBetween atravessa a transição sem perder uma noite", () => {
    expect(nightsBetween("2026-03-07", "2026-03-09")).toBe(2);
    expect(nightsBetween("2026-10-31", "2026-11-02")).toBe(2);
  });

  it("addDays e formatDate seguem estáveis", () => {
    expect(addDays("2026-03-07", 2)).toBe("2026-03-09");
    expect(formatDate("2026-12-01", "short")).toBe("01/12/2026");
  });
});
