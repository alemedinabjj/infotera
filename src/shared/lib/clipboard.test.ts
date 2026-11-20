import { afterEach, describe, expect, it, vi } from "vitest";
import { copyText } from "./clipboard";

afterEach(() => vi.unstubAllGlobals());

describe("copyText", () => {
  it("devolve true e escreve o texto exato", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    await expect(copyText("abc")).resolves.toBe(true);
    expect(writeText).toHaveBeenCalledWith("abc");
  });

  it("sem navigator.clipboard devolve false", async () => {
    vi.stubGlobal("navigator", {});
    await expect(copyText("abc")).resolves.toBe(false);
  });

  it("writeText que rejeita devolve false, sem lançar", async () => {
    vi.stubGlobal("navigator", {
      clipboard: {
        writeText: vi.fn().mockRejectedValue(new DOMException("no", "NotAllowedError")),
      },
    });
    await expect(copyText("abc")).resolves.toBe(false);
  });

  it("writeText que lança de forma síncrona também devolve false", async () => {
    vi.stubGlobal("navigator", {
      clipboard: {
        writeText: () => {
          throw new Error("boom");
        },
      },
    });
    await expect(copyText("abc")).resolves.toBe(false);
  });
});
