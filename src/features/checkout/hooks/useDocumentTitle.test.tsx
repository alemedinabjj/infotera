import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { useDocumentTitle } from "./useDocumentTitle";

afterEach(() => {
  document.title = "";
});

describe("useDocumentTitle", () => {
  it("define o título com a marca", () => {
    renderHook(() => useDocumentTitle("Passo 1 de 3: Dados dos hóspedes"));
    expect(document.title).toBe("Passo 1 de 3: Dados dos hóspedes | Infotera Hotéis");
  });

  it("reafirma o título quando o metadata o reescreve depois", async () => {
    renderHook(() => useDocumentTitle("Passo 1 de 3: Dados dos hóspedes"));
    document.title = "Finalizar reserva | Infotera Hotéis";
    await waitFor(() =>
      expect(document.title).toBe("Passo 1 de 3: Dados dos hóspedes | Infotera Hotéis"),
    );
  });

  it("acompanha a troca de passo e solta o título ao desmontar", async () => {
    const { rerender, unmount } = renderHook(({ title }) => useDocumentTitle(title), {
      initialProps: { title: "Passo 1" },
    });
    rerender({ title: "Passo 2" });
    expect(document.title).toBe("Passo 2 | Infotera Hotéis");
    unmount();
    document.title = "Outra página";
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(document.title).toBe("Outra página");
  });
});
