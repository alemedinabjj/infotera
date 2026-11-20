// @vitest-environment node
import { describe, expect, it } from "vitest";
import { z } from "@/shared/lib/zod";
import { createStorage } from "./storage";

describe("createStorage sem window (SSR)", () => {
  it("lê o fallback e não lança ao escrever ou remover", () => {
    const storage = createStorage("local");
    const fallback = { n: 0 };
    expect(typeof window).toBe("undefined");
    expect(storage.read("k", z.object({ n: z.number() }), fallback)).toBe(fallback);
    expect(() => storage.write("k", { n: 1 })).not.toThrow();
    expect(() => storage.remove("k")).not.toThrow();
  });
});
