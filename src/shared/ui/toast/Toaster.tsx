"use client";

import { AnimatePresence } from "motion/react";
import { ToastItem } from "./ToastItem";
import { useToastStore } from "./toast-store";
import { useRegionPause } from "./useRegionPause";

const REGION_CLASS = "flex flex-col gap-3";

/**
 * Duas regiões vivas sempre montadas: `role="status"` (sucesso/info) e `role="alert"` (erro).
 * Nunca rouba o foco. O tempo pausa com hover/foco em qualquer toast e com a aba oculta.
 * Fica acima da bandeja de comparação (`--bottom-bar-height`). Montar uma vez no layout raiz.
 */
export const Toaster = () => {
  const toasts = useToastStore((state) => state.toasts);
  const { paused, handlers } = useRegionPause();

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: pausa passiva do timer; ações internas são botões focáveis
    <div
      data-toaster
      {...handlers}
      className="pointer-events-none fixed inset-x-4 bottom-[calc(var(--bottom-bar-height,0px)+1rem)] z-50 flex flex-col gap-3 sm:right-6 sm:bottom-[calc(var(--bottom-bar-height,0px)+1.5rem)] sm:left-auto sm:w-96 print:hidden"
    >
      <div role="status" aria-live="polite" className={REGION_CLASS}>
        <AnimatePresence initial={false}>
          {toasts
            .filter((item) => item.tone !== "error")
            .map((item) => (
              <ToastItem key={item.id} item={item} paused={paused} />
            ))}
        </AnimatePresence>
      </div>
      <div role="alert" className={REGION_CLASS}>
        <AnimatePresence initial={false}>
          {toasts
            .filter((item) => item.tone === "error")
            .map((item) => (
              <ToastItem key={item.id} item={item} paused={paused} />
            ))}
        </AnimatePresence>
      </div>
    </div>
  );
};
