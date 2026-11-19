import { describe, expect, it } from "vitest";
import { isObscuredByBar, isTrayHiddenOn } from "./tray";

describe("isTrayHiddenOn", () => {
  it.each([
    ["/checkout", true],
    ["/checkout/", true],
    ["/confirmation/abc123", true],
    ["/compare", true],
    ["/", false],
    ["/search", false],
    ["/hotel/1", false],
    ["/favorites", false],
    ["/my-bookings", false],
    ["/comparer", false],
  ])("%s -> %s", (path, hidden) => {
    expect(isTrayHiddenOn(path)).toBe(hidden);
  });
});

describe("isObscuredByBar", () => {
  it("só é coberto quando a base passa do topo da barra", () => {
    expect(isObscuredByBar(700, 700)).toBe(false);
    expect(isObscuredByBar(701, 700)).toBe(true);
    expect(isObscuredByBar(500, 700)).toBe(false);
  });
});
