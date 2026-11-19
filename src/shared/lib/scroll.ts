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

const prefersReducedMotion = (): boolean =>
  typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Traz o elemento à vista só se ele não estiver inteiro na janela (abaixo do header fixo):
 * `scrollIntoView({ block: "nearest" })`, que rola o mínimo e respeita o `scroll-padding` do
 * `<html>`. Nunca mexe no foco; `behavior: "auto"` com movimento reduzido.
 */
export const revealNearest = (element: Element | null): void => {
  if (!element || typeof element.scrollIntoView !== "function") return;
  const padding = Number.parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop);
  const limit = Number.isNaN(padding) ? 0 : padding;
  const rect = element.getBoundingClientRect();
  if (rect.top >= limit && rect.bottom <= window.innerHeight) return;
  element.scrollIntoView({
    block: "nearest",
    behavior: prefersReducedMotion() ? "auto" : "smooth",
  });
};
