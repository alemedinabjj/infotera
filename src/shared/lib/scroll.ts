/**
 * Garante que o topo do elemento não fique atrás do header fixo. Só rola quando o topo está acima
 * do `scroll-padding-top` do `<html>` (a folga que o CSS reserva para o header); se já está à
 * vista, não mexe. Sem `scroll-padding-top` definido, o limite é o topo da janela.
 */
export const revealBelowHeader = (element: Element | null): void => {
  if (!element) return;
  const padding = Number.parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop);
  const limit = Number.isNaN(padding) ? 0 : padding;
  if (element.getBoundingClientRect().top < limit) element.scrollIntoView?.({ block: "start" });
};
