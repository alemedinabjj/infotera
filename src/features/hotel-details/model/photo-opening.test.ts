import { describe, expect, it } from "vitest";
import {
  arrivedAfterDismiss,
  hasArrived,
  IDLE_OPENING,
  isModifiedClick,
  visiblePhase,
} from "./photo-opening";

describe("visiblePhase", () => {
  it("enquanto o caminho é o de origem, mostra a fase", () => {
    expect(visiblePhase({ phase: "opening", from: "/hotel/1", dismissed: false }, "/hotel/1")).toBe(
      "opening",
    );
    expect(visiblePhase({ phase: "offline", from: "/hotel/1", dismissed: false }, "/hotel/1")).toBe(
      "offline",
    );
  });

  it("quando o caminho muda (a rota chegou), some", () => {
    expect(
      visiblePhase({ phase: "opening", from: "/hotel/1", dismissed: false }, "/hotel/1/photos/1"),
    ).toBe("idle");
  });

  it("fechado pela pessoa, some antes de a rota chegar", () => {
    expect(visiblePhase({ phase: "opening", from: "/hotel/1", dismissed: true }, "/hotel/1")).toBe(
      "idle",
    );
  });

  it("parado, é idle", () => {
    expect(visiblePhase(IDLE_OPENING, "/hotel/1")).toBe("idle");
  });
});

describe("hasArrived e arrivedAfterDismiss", () => {
  const pending = { phase: "opening", from: "/hotel/1", dismissed: false } as const;

  it("só chegou quando o caminho mudou", () => {
    expect(hasArrived(pending, "/hotel/1")).toBe(false);
    expect(hasArrived(pending, "/hotel/1/photos/1")).toBe(true);
    expect(hasArrived(IDLE_OPENING, "/hotel/1/photos/1")).toBe(false);
  });

  it("a rota que chega depois de fechar o carregamento deve ser desfeita", () => {
    expect(arrivedAfterDismiss({ ...pending, dismissed: true }, "/hotel/1/photos/1")).toBe(true);
    expect(arrivedAfterDismiss(pending, "/hotel/1/photos/1")).toBe(false);
    expect(arrivedAfterDismiss({ ...pending, dismissed: true }, "/hotel/1")).toBe(false);
  });

  it("o offline fechado nunca desfaz nada (não houve navegação)", () => {
    expect(
      arrivedAfterDismiss(
        { phase: "offline", from: "/hotel/1", dismissed: true },
        "/hotel/1/photos/1",
      ),
    ).toBe(false);
  });
});

describe("isModifiedClick", () => {
  const base = { button: 0, metaKey: false, ctrlKey: false, shiftKey: false, altKey: false };
  it("clique simples não é modificado", () => {
    expect(isModifiedClick(base)).toBe(false);
  });
  it.each([
    { button: 1 },
    { metaKey: true },
    { ctrlKey: true },
    { shiftKey: true },
    { altKey: true },
  ])("%o é modificado", (patch) => {
    expect(isModifiedClick({ ...base, ...patch })).toBe(true);
  });
});
