import { afterEach, describe, expect, it, vi } from "vitest";
import { copyCurrentUrl } from "./copyCurrentUrl";
import { toast } from "./toast-store";

describe("copyCurrentUrl", () => {
  afterEach(() => vi.restoreAllMocks());

  it("copia a URL atual e avisa por toast", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    const success = vi.spyOn(toast, "success");
    await copyCurrentUrl();
    expect(writeText).toHaveBeenCalledWith(window.location.href);
    expect(success).toHaveBeenCalledWith("Link copiado.");
    vi.unstubAllGlobals();
  });

  it("falha na área de transferência vira toast de erro", async () => {
    vi.stubGlobal("navigator", {
      clipboard: { writeText: vi.fn().mockRejectedValue(new Error("negado")) },
    });
    const error = vi.spyOn(toast, "error");
    await copyCurrentUrl();
    expect(error).toHaveBeenCalledWith(
      "Não foi possível copiar. Copie o endereço na barra do navegador.",
    );
    vi.unstubAllGlobals();
  });
});
