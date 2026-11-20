import { isValidElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { CheckoutPage } from "@/features/checkout";
import Page, { generateMetadata } from "./page";

const connection = vi.hoisted(() => vi.fn(async () => undefined));
vi.mock("next/server", () => ({ connection }));

describe("/checkout", () => {
  it("é dinâmica (connection) e compõe a feature", async () => {
    const element = await Page();
    expect(connection).toHaveBeenCalledTimes(1);
    expect(isValidElement(element)).toBe(true);
    expect(element.type).toBe(CheckoutPage);
  });

  it("título no idioma da rota e noindex", async () => {
    const pt = await generateMetadata({ params: Promise.resolve({ locale: "pt-BR" }) });
    expect(pt.title).toBe("Finalizar reserva | Infotera Hotéis");
    expect(pt.robots).toEqual({ index: false });
    const en = await generateMetadata({ params: Promise.resolve({ locale: "en-US" }) });
    expect(en.title).toBe("Complete your booking | Infotera Hotéis");
  });
});
