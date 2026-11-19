import { afterEach, describe, expect, it } from "vitest";
import { consumeFocusAfterNavigation, markFocusAfterNavigation } from "./focus-after-navigation";

const go = (url: string): void => window.history.replaceState(null, "", url);

describe("focus-after-navigation", () => {
  afterEach(() => {
    consumeFocusAfterNavigation();
    go("/");
  });

  it("sem marca nunca foca", () => {
    expect(consumeFocusAfterNavigation()).toBe(false);
  });

  it("foca quando a página chegou ao destino marcado", () => {
    go("/hotel/1");
    markFocusAfterNavigation("/hotel/1?checkIn=2026-12-01");
    go("/hotel/1?checkIn=2026-12-01");
    expect(consumeFocusAfterNavigation()).toBe(true);
  });

  it("é consumido: a segunda leitura não foca", () => {
    go("/hotel/1");
    markFocusAfterNavigation("/hotel/1?a=1");
    go("/hotel/1?a=1");
    consumeFocusAfterNavigation();
    expect(consumeFocusAfterNavigation()).toBe(false);
  });

  it("envio inválido (sem marca) não move o foco na página seguinte", () => {
    go("/hotel/1");
    // envio inválido: ninguém chama markFocusAfterNavigation; a pessoa segue para outra página
    go("/checkout");
    expect(consumeFocusAfterNavigation()).toBe(false);
  });

  it("marca de outro destino não rouba o foco em outra página", () => {
    go("/hotel/1");
    markFocusAfterNavigation("/hotel/1?a=1");
    go("/search?destination=Rio");
    expect(consumeFocusAfterNavigation()).toBe(false);
    go("/hotel/1?a=1");
    expect(consumeFocusAfterNavigation()).toBe(false);
  });

  it("critérios idênticos não deixam sinal vivo", () => {
    go("/hotel/1?a=1");
    markFocusAfterNavigation("/hotel/1?a=1");
    expect(consumeFocusAfterNavigation()).toBe(false);
  });

  it("envio idêntico depois de um diferente descarta o sinal antigo", () => {
    go("/hotel/1?a=1");
    markFocusAfterNavigation("/hotel/1?a=2");
    markFocusAfterNavigation("/hotel/1?a=1");
    go("/hotel/1?a=2");
    expect(consumeFocusAfterNavigation()).toBe(false);
  });
});
