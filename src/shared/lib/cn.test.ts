import { describe, expect, it } from "vitest";
import { cn } from "@/shared/lib/cn";

describe("cn", () => {
  it("resolve classes conflitantes do Tailwind mantendo a última", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
  });

  it("ignora valores falsy e undefined", () => {
    expect(cn("a", false, undefined, null, "", "b")).toBe("a b");
  });

  it("aceita condicionais em objeto", () => {
    expect(cn("a", { b: true, c: false })).toBe("a b");
  });
});
