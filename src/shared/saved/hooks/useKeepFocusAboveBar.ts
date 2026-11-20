"use client";

import { useEffect } from "react";
import { isObscuredByBar } from "../model/tray";

/**
 * WCAG 2.4.11: o foco por **teclado** nunca fica coberto pela bandeja. No `focusin`, se o elemento
 * termina sob a barra, rola o mínimo (`block: "nearest"`, `behavior: "instant"`: uma rolagem suave ainda em andamento quando a rota troca abria a página nova rolada).
 * Nunca por clique ou toque: mover a página entre `pointerdown` e `click` desloca o alvo.
 */
export const useKeepFocusAboveBar = (active: boolean) => {
  useEffect(() => {
    if (!active) return;
    let pointerActive = false;
    const onPointerDown = () => {
      pointerActive = true;
    };
    const onPointerEnd = () => {
      pointerActive = false;
    };
    const onFocusIn = (event: FocusEvent) => {
      const target = event.target;
      const node = document.querySelector<HTMLElement>("[data-bottom-bar]");
      if (pointerActive || !node || !(target instanceof HTMLElement) || node.contains(target)) {
        return;
      }
      const barTop = node.getBoundingClientRect().top;
      if (isObscuredByBar(target.getBoundingClientRect().bottom, barTop)) {
        target.scrollIntoView({ block: "nearest", behavior: "instant" });
      }
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("pointerup", onPointerEnd, true);
    document.addEventListener("pointercancel", onPointerEnd, true);
    document.addEventListener("keydown", onPointerEnd, true);
    document.addEventListener("focusin", onFocusIn);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("pointerup", onPointerEnd, true);
      document.removeEventListener("pointercancel", onPointerEnd, true);
      document.removeEventListener("keydown", onPointerEnd, true);
      document.removeEventListener("focusin", onFocusIn);
    };
  }, [active]);
};
