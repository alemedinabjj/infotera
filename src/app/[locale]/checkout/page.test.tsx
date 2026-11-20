import { isValidElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { CheckoutPage } from "@/features/checkout";
import Page, { metadata } from "./page";

const connection = vi.hoisted(() => vi.fn(async () => undefined));
vi.mock("next/server", () => ({ connection }));

describe("/checkout", () => {
  it("é dinâmica (connection) e compõe a feature", async () => {
    const element = await Page();
    expect(connection).toHaveBeenCalledTimes(1);
    expect(isValidElement(element)).toBe(true);
    expect(element.type).toBe(CheckoutPage);
  });

  it("título e noindex", () => {
    expect(metadata.title).toBe("Finalizar reserva | Infotera Hotéis");
    expect(metadata.robots).toEqual({ index: false });
  });
});
