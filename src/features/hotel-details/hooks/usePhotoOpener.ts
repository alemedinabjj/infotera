"use client";

import { useEffect } from "react";

const OPENER = "[data-photo-opener]";
const MAIN = "[data-photo-main]";

/**
 * Registra o link que abriu a galeria (o Safari não foca link no clique, então `document.activeElement`
 * não é confiável). Só um link fica marcado por vez.
 */
export const markPhotoOpener = (link: HTMLElement): void => {
  for (const previous of document.querySelectorAll(OPENER))
    previous.removeAttribute("data-photo-opener");
  link.setAttribute("data-photo-opener", "");
};

// `checkVisibility` cobre `display: none` do próprio link ou de um ancestral (miniatura `hidden` no celular).
const isVisible = (element: HTMLElement): boolean =>
  element.isConnected &&
  (typeof element.checkVisibility !== "function" || element.checkVisibility());

/**
 * Devolve o foco ao link registrado, se ainda estiver no DOM e visível; senão à foto principal (ex.:
 * modal reaberto por Avançar, ou miniatura escondida porque a tela encolheu). Nunca `body`.
 */
export const restorePhotoFocus = (): void => {
  const opener = document.querySelector<HTMLElement>(OPENER);
  const target = opener && isVisible(opener) ? opener : document.querySelector<HTMLElement>(MAIN);
  target?.focus({ preventScroll: true });
};

/** Devolve o foco ao desmontar: Voltar do navegador desmonta o modal sem passar por `close()`. */
export const usePhotoOpener = (): void => {
  useEffect(() => restorePhotoFocus, []);
};
