import { revealBelowHeader } from "@/shared/lib/scroll";

/**
 * Leva o foco ao h2 da seção (`tabIndex=-1`) sem rolar e só rola se ele ficou atrás do header
 * fixo (lição da F2/F3: foco programático nunca fica sob o header).
 */
export const focusHeading = (headingId: string): void => {
  const heading = document.getElementById(headingId);
  if (!heading) return;
  heading.focus({ preventScroll: true });
  revealBelowHeader(heading);
};

/**
 * O h2 da seção que contém `anchor` (o id pode se repetir: o Activity guarda a rota do hotel anterior
 * escondida, com o mesmo `quartos-titulo`). Sem seção ao redor, cai no `getElementById`.
 */
export const findHeading = (headingId: string, anchor: Element | null): HTMLElement | null =>
  anchor?.closest("section")?.querySelector<HTMLElement>(`[id="${headingId}"]`) ??
  document.getElementById(headingId);

/**
 * Foca um h2 já capturado, só se ele ainda está na página **e visível**: com `<Activity mode="hidden">`
 * a seção continua no DOM (`display: none`) e o foco não pode ir para ela.
 */
export const focusHeadingElement = (heading: HTMLElement | null): void => {
  if (!heading?.isConnected) return;
  // `checkVisibility` falta no jsdom: aí vale "visível".
  if (typeof heading.checkVisibility === "function" && !heading.checkVisibility()) return;
  heading.focus({ preventScroll: true });
  revealBelowHeader(heading);
};
