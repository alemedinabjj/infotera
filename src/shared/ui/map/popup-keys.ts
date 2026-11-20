/** O que fazer com uma tecla dentro do popup: fechar e para onde levar o foco (`null` = deixa passar). */
export type PopupKeyAction = "close-to-marker" | "close-to-next" | null;

type PopupKeyInput = {
  key: string;
  shiftKey: boolean;
  /** O foco está no primeiro controle do popup. */
  atFirst: boolean;
  /** O foco está no último controle do popup. */
  atLast: boolean;
};

/**
 * Teclado do popup (DS §9.9). Esc e Shift+Tab no primeiro controle voltam ao marcador; Tab no último
 * fecha e segue para o próximo marcador. Tab no meio do popup anda normalmente (`null`).
 */
export const popupKeyAction = ({
  key,
  shiftKey,
  atFirst,
  atLast,
}: PopupKeyInput): PopupKeyAction => {
  if (key === "Escape") return "close-to-marker";
  if (key !== "Tab") return null;
  if (shiftKey) return atFirst ? "close-to-marker" : null;
  return atLast ? "close-to-next" : null;
};

const MARKER_CLASS = "leaflet-marker-icon";

/** Próximo marcador no DOM (a ordem da lista); no último, o próprio marcador. */
export const nextMarkerElement = (current: HTMLElement | undefined): HTMLElement | undefined => {
  const next = current?.nextElementSibling;
  return next instanceof HTMLElement && next.classList.contains(MARKER_CLASS) ? next : current;
};
