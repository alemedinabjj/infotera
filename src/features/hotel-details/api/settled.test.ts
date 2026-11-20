import { describe, expect, it } from "vitest";
import { settle } from "./settled";

describe("settle", () => {
  it("embrulha o valor resolvido", async () => {
    await expect(settle(Promise.resolve([1, 2]))).resolves.toEqual({ kind: "ok", value: [1, 2] });
  });

  it("transforma a rejeição em erro, sem relançar nem expor a causa", async () => {
    const result = await settle(Promise.reject(new Error("API caiu: 500")));
    expect(result).toEqual({ kind: "error" });
  });
});
