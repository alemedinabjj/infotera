import { describe, expect, it } from "vitest";
import { INSTALL_SNOOZE_DAYS, installDismissedSchema, installPromptView } from "./install-prompt";

const NOW = Date.parse("2026-12-01T12:00:00.000Z");
const daysAgo = (days: number): string => new Date(NOW - days * 86_400_000).toISOString();

const view = (overrides: Partial<Parameters<typeof installPromptView>[0]> = {}) =>
  installPromptView({
    hasPrompt: true,
    isStandalone: false,
    dismissedAt: null,
    now: NOW,
    ...overrides,
  });

describe("installPromptView", () => {
  it.each([
    ["sem evento do navegador", { hasPrompt: false }, "hidden"],
    ["já instalado (standalone)", { isStandalone: true }, "hidden"],
    [
      "standalone mesmo com evento e sem dispensa",
      { isStandalone: true, dismissedAt: null },
      "hidden",
    ],
    ["nunca dispensado", { dismissedAt: null }, "show"],
    ["dispensado agora", { dismissedAt: daysAgo(0) }, "hidden"],
    ["dispensado há 1 dia", { dismissedAt: daysAgo(1) }, "hidden"],
    ["dispensado há 29 dias", { dismissedAt: daysAgo(29) }, "hidden"],
    ["dispensado há 29 dias e 23 h", { dismissedAt: daysAgo(29.96) }, "hidden"],
    ["dispensado há 30 dias", { dismissedAt: daysAgo(30) }, "show"],
    ["dispensado há 31 dias", { dismissedAt: daysAgo(31) }, "show"],
    ["valor gravado inválido", { dismissedAt: "ontem" }, "show"],
    ["valor gravado vazio", { dismissedAt: "" }, "show"],
    ["dispensado no futuro (relógio mudou)", { dismissedAt: daysAgo(-3) }, "hidden"],
  ] as const)("%s → %s", (_name, overrides, expected) => {
    expect(view(overrides)).toBe(expected);
  });

  it("o prazo é de 30 dias", () => {
    expect(INSTALL_SNOOZE_DAYS).toBe(30);
  });
});

describe("installDismissedSchema", () => {
  it("aceita ISO com hora e null; rejeita o resto", () => {
    expect(installDismissedSchema.safeParse("2026-12-01T12:00:00.000Z").success).toBe(true);
    expect(installDismissedSchema.safeParse(null).success).toBe(true);
    expect(installDismissedSchema.safeParse("2026-12-01").success).toBe(false);
    expect(installDismissedSchema.safeParse(123).success).toBe(false);
  });
});
