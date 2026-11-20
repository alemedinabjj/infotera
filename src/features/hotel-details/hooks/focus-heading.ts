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
