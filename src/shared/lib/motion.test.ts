import { describe, expect, it } from "vitest";
import {
  EASE_EXIT,
  EASE_STANDARD,
  type MotionPresetName,
  motionPreset,
  shouldAnimateItem,
  staggerDelay,
  stepDirection,
} from "./motion";

const NAMES: MotionPresetName[] = [
  "list-item",
  "dialog-center",
  "dialog-sheet",
  "dialog-full",
  "toast",
  "tray",
  "step",
  "favorite-pulse",
  "badge-pulse",
];

const MOVING_KEYS = ["x", "y", "scale"] as const;

const hasMotion = (state: object | undefined): boolean =>
  state !== undefined && MOVING_KEYS.some((key) => key in state);

describe("motionPreset", () => {
  it("usa os tokens de duração e curva do design system", () => {
    expect(motionPreset("list-item", false).transition.duration).toBe(0.2);
    expect(motionPreset("dialog-center", false).transition.duration).toBe(0.3);
    expect(motionPreset("dialog-center", false).transition.ease).toEqual(EASE_STANDARD);
    expect(motionPreset("dialog-sheet", false).exit?.transition?.duration).toBe(0.2);
    expect(motionPreset("dialog-sheet", false).exit?.transition?.ease).toEqual(EASE_EXIT);
    expect(motionPreset("toast", false).transition.duration).toBe(0.2);
    expect(motionPreset("toast", false).exit?.transition?.duration).toBe(0.15);
    expect(motionPreset("step", false).transition.duration).toBe(0.2);
    expect(motionPreset("favorite-pulse", false).transition.duration).toBe(0.3);
  });

  it("não move nada em listas (só opacidade)", () => {
    const preset = motionPreset("list-item", false);
    expect(hasMotion(preset.initial)).toBe(false);
    expect(hasMotion(preset.animate)).toBe(false);
  });

  it.each(NAMES)("%s: com reduced motion não tem x/y/scale e dura até 0,15 s", (name) => {
    const preset = motionPreset(name, true);
    expect(hasMotion(preset.initial)).toBe(false);
    expect(hasMotion(preset.animate)).toBe(false);
    expect(hasMotion(preset.exit)).toBe(false);
    expect(preset.transition.duration).toBeLessThanOrEqual(0.15);
    expect(preset.exit?.transition?.duration ?? 0).toBeLessThanOrEqual(0.15);
  });

  it("o passo nunca começa invisível", () => {
    expect(motionPreset("step", false).initial).not.toHaveProperty("opacity");
    expect(motionPreset("step", true).initial).toEqual({});
  });

  it("o passo entra pela direção pedida", () => {
    expect(motionPreset("step", false, 1).initial).toMatchObject({ x: 16 });
    expect(motionPreset("step", false, -1).initial).toMatchObject({ x: -16 });
  });
});

describe("staggerDelay", () => {
  it("40 ms por item com teto no sexto", () => {
    expect(staggerDelay(0)).toBe(0);
    expect(staggerDelay(1)).toBeCloseTo(0.04);
    expect(staggerDelay(5)).toBeCloseTo(0.2);
    expect(staggerDelay(40)).toBeCloseTo(0.2);
  });
});

describe("shouldAnimateItem", () => {
  it("só anima itens ainda não vistos", () => {
    expect(shouldAnimateItem(0, 0)).toBe(true);
    expect(shouldAnimateItem(4, 5)).toBe(false);
    expect(shouldAnimateItem(5, 5)).toBe(true);
  });
});

describe("stepDirection", () => {
  it("avançar é 1 e voltar é -1", () => {
    expect(stepDirection(0, 1)).toBe(1);
    expect(stepDirection(2, 1)).toBe(-1);
    expect(stepDirection(1, 1)).toBe(1);
  });
});
