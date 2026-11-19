import { describe, expect, it } from "vitest";
import { makeRow, NO, onlyDifferences, YES } from "./comparison";

describe("makeRow", () => {
  it("differs quando alguma célula é diferente", () => {
    expect(makeRow("a", "A", "text", ["1", "2"]).differs).toBe(true);
    expect(makeRow("a", "A", "text", ["1", "1", "1"]).differs).toBe(false);
    expect(makeRow("a", "A", "boolean", [YES, NO]).differs).toBe(true);
  });
});

describe("onlyDifferences", () => {
  it("mantém só as linhas que diferem", () => {
    const rows = [makeRow("a", "A", "text", ["1", "1"]), makeRow("b", "B", "text", ["1", "2"])];
    expect(onlyDifferences(rows).map((row) => row.key)).toEqual(["b"]);
  });
});
