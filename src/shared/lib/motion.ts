/** Tokens de movimento do design system (§1.8) em segundos e curvas de bezier. */
export type Bezier = [number, number, number, number];

export const EASE_STANDARD: Bezier = [0.2, 0, 0, 1];
export const EASE_EXIT: Bezier = [0.3, 0, 1, 1];

export const DURATION = { fast: 0.15, base: 0.2, slow: 0.3 } as const;

const STAGGER_STEP_S = 0.04;
const STAGGER_MAX_INDEX = 5;
const STEP_OFFSET_PX = 16;

export type MotionPresetName =
  | "list-item"
  | "dialog-center"
  | "dialog-sheet"
  | "dialog-full"
  | "toast"
  | "tray"
  | "step"
  | "favorite-pulse"
  | "badge-pulse";

export type MotionTransition = { duration: number; ease?: Bezier; delay?: number };

/** Estado animável: só `opacity` e `transform`, nunca propriedades de layout. */
export type MotionState = {
  opacity?: number;
  x?: number | string;
  y?: number | string;
  scale?: number | number[];
};

export type MotionExit = MotionState & { transition?: MotionTransition };

export type MotionPreset = {
  initial: MotionState;
  animate: MotionState;
  exit?: MotionExit;
  transition: MotionTransition;
};

const fade = (duration: number, exit?: number): MotionPreset => ({
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  ...(exit === undefined
    ? {}
    : { exit: { opacity: 0, transition: { duration: exit, ease: EASE_EXIT } } }),
  transition: { duration, ease: EASE_STANDARD },
});

const regular = (name: MotionPresetName, direction: 1 | -1): MotionPreset => {
  switch (name) {
    case "list-item":
      return fade(DURATION.base);
    case "dialog-full":
      return fade(DURATION.base, DURATION.base);
    case "dialog-center":
      return {
        initial: { opacity: 0, scale: 0.96 },
        animate: { opacity: 1, scale: 1 },
        exit: {
          opacity: 0,
          scale: 0.96,
          transition: { duration: DURATION.base, ease: EASE_EXIT },
        },
        transition: { duration: DURATION.slow, ease: EASE_STANDARD },
      };
    case "dialog-sheet":
      return {
        initial: { y: "100%" },
        animate: { y: 0 },
        exit: { y: "100%", transition: { duration: DURATION.base, ease: EASE_EXIT } },
        transition: { duration: DURATION.slow, ease: EASE_STANDARD },
      };
    case "toast":
      return {
        initial: { opacity: 0, y: STEP_OFFSET_PX },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, transition: { duration: DURATION.fast, ease: EASE_EXIT } },
        transition: { duration: DURATION.base, ease: EASE_STANDARD },
      };
    case "tray":
      return {
        initial: { y: "100%" },
        animate: { y: 0 },
        exit: { y: "100%", transition: { duration: DURATION.base, ease: EASE_EXIT } },
        transition: { duration: DURATION.slow, ease: EASE_STANDARD },
      };
    case "step":
      return {
        initial: { opacity: 0, x: direction * STEP_OFFSET_PX },
        animate: { opacity: 1, x: 0 },
        transition: { duration: DURATION.base, ease: EASE_STANDARD },
      };
    case "favorite-pulse":
      return {
        initial: { scale: 1 },
        animate: { scale: [1, 1.3, 1] },
        transition: { duration: DURATION.slow, ease: EASE_STANDARD },
      };
    case "badge-pulse":
      return {
        initial: { scale: 1 },
        animate: { scale: [1, 1.2, 1] },
        transition: { duration: DURATION.slow, ease: EASE_STANDARD },
      };
    default: {
      const unreachable: never = name;
      return unreachable;
    }
  }
};

/** Com reduced motion nada se move: só fade curto (WCAG 2.3.3 trata de movimento). */
const reducedFade = (hasExit: boolean): MotionPreset =>
  fade(DURATION.fast, hasExit ? DURATION.fast : undefined);

const PULSES: readonly MotionPresetName[] = ["favorite-pulse", "badge-pulse"];

/**
 * Preset de animação pelo nome. `reduced` zera deslocamento e escala e limita o fade a 150 ms.
 * `direction` só vale para `step` (1 avança, -1 volta).
 */
export const motionPreset = (
  name: MotionPresetName,
  reduced: boolean,
  direction: 1 | -1 = 1,
): MotionPreset => {
  if (!reduced) return regular(name, direction);
  if (PULSES.includes(name)) {
    return { initial: {}, animate: {}, transition: { duration: DURATION.fast } };
  }
  return reducedFade(regular(name, direction).exit !== undefined);
};

/** Atraso (s) do item `index` numa lista: 40 ms por item, teto no sexto. */
export const staggerDelay = (index: number): number =>
  STAGGER_STEP_S * Math.min(Math.max(index, 0), STAGGER_MAX_INDEX);

/** Itens já vistos (remontados pela virtualização) não animam de novo. */
export const shouldAnimateItem = (index: number, seenCount: number): boolean => index >= seenCount;

/** Direção da troca de passo: avançar entra pela direita (1), voltar pela esquerda (-1). */
export const stepDirection = (prev: number, next: number): 1 | -1 => (next >= prev ? 1 : -1);
