"use client";

import { m, useReducedMotion } from "motion/react";
import { type ReactNode, useState } from "react";
import { motionPreset, stepDirection } from "@/shared/lib/motion";
import { type CheckoutStep, stepNumber } from "../model/steps";

type Entry = { step: CheckoutStep; direction: 1 | -1; animated: boolean };

/**
 * Só o passo novo anima, na direção do avanço (entra pela direita; voltar entra pela esquerda), sem
 * saída: não há intervalo em que o foco fica num passo desmontando. A primeira renderização não
 * anima. `overflow-x-clip` evita rolagem horizontal em 320 px durante o deslocamento.
 */
export const AnimatedStep = ({ step, children }: { step: CheckoutStep; children: ReactNode }) => {
  const [entry, setEntry] = useState<Entry>({ step, direction: 1, animated: false });
  const reduced = useReducedMotion() ?? false;
  if (entry.step !== step) {
    setEntry({
      step,
      direction: stepDirection(stepNumber(entry.step), stepNumber(step)),
      animated: true,
    });
  }
  const preset = motionPreset("step", reduced, entry.direction);

  return (
    <div className="overflow-x-clip">
      <m.div
        key={step}
        initial={entry.animated ? preset.initial : false}
        animate={preset.animate}
        transition={preset.transition}
        className="flex flex-col gap-5"
      >
        {children}
      </m.div>
    </div>
  );
};
