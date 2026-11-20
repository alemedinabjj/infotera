import { isValidElement } from "react";
import { describe, expect, it, vi } from "vitest";
import UnknownPathPage, { generateMetadata } from "./page";

const rootLocale = vi.hoisted(() => ({ value: "pt-BR" }));
vi.mock("next/root-params", () => ({ locale: async () => rootLocale.value }));

describe("[...rest]", () => {
  it("renderiza o 'não encontrado' no servidor (elemento, não notFound())", async () => {
    expect(isValidElement(await UnknownPathPage())).toBe(true);
  });

  it("título e noindex no idioma", async () => {
    rootLocale.value = "pt-BR";
    const pt = await generateMetadata();
    rootLocale.value = "en-US";
    const en = await generateMetadata();
    expect(pt.robots).toEqual({ index: false });
    expect(pt.title).toBe("Página não encontrada | Infotera Hotéis");
    expect(en.title).toBe("Page not found | Infotera Hotéis");
  });
});
