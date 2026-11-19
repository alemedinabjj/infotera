import { describe, expect, it } from "vitest";
import { splitNumberGroups } from "./booking-number";

describe("splitNumberGroups", () => {
  it("parte depois de cada hífen e preserva o texto", () => {
    const id = "3f2a9c1e-7b4d-4e8a-9f12-6c0d3b2a1e57";
    const groups = splitNumberGroups(id);
    expect(groups.map((group) => group.text)).toEqual([
      "3f2a9c1e-",
      "7b4d-",
      "4e8a-",
      "9f12-",
      "6c0d3b2a1e57",
    ]);
    expect(groups.map((group) => group.text).join("")).toBe(id);
    expect(new Set(groups.map((group) => group.key)).size).toBe(groups.length);
  });

  it("sem hífen, um grupo só", () => {
    expect(splitNumberGroups("abc")).toEqual([{ key: "0", text: "abc" }]);
  });
});
