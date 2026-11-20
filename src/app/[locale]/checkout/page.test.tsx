import { isValidElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { CheckoutPage } from "@/features/checkout";
import { WipeOnHide } from "@/shared/ui";
import Page, { generateMetadata } from "./page";

const connection = vi.hoisted(() => vi.fn(async () => undefined));
vi.mock("next/server", () => ({ connection }));

describe("/checkout", () => {
  it("é dinâmica (connection) e compõe a feature", async () => {
    const element = await Page();
    if (!isValidElement<{ children: unknown }>(element)) throw new Error("não é um elemento");
    expect(connection).toHaveBeenCalledTimes(1);
    expect(isValidElement(element)).toBe(true);
    // Embrulhada em `WipeOnHide`: o Activity não guarda o formulário (PII) no DOM escondido.
    expect(element.type).toBe(WipeOnHide);
    const inner = element.props.children;
    expect(isValidElement(inner)).toBe(true);
    if (isValidElement(inner)) expect(inner.type).toBe(CheckoutPage);
  });

  it("título no idioma da rota e noindex", async () => {
    const pt = await generateMetadata({ params: Promise.resolve({ locale: "pt-BR" }) });
    expect(pt.title).toBe("Finalizar reserva | Infotera Hotéis");
    expect(pt.robots).toEqual({ index: false });
    const en = await generateMetadata({ params: Promise.resolve({ locale: "en-US" }) });
    expect(en.title).toBe("Complete your booking | Infotera Hotéis");
  });
});
