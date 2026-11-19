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

/** Folga entre o bloco revelado e a barra de ação fixa. */
const ACTION_BAR_GAP = 8;

export type RevealBox = { top: number; bottom: number };

/**
 * Quanto rolar (px, positivo = para baixo) para o bloco ficar na área útil `[topLimit, bottomLimit]`.
 * Rola quando o topo está sob o header **ou** o fim está abaixo da área útil; bloco mais alto que
 * a área útil alinha pelo topo. Função pura.
 */
export const revealDelta = (box: RevealBox, topLimit: number, bottomLimit: number): number => {
  if (box.top < topLimit || box.bottom - box.top > bottomLimit - topLimit) {
    return box.top - topLimit;
  }
  return box.bottom > bottomLimit ? box.bottom - bottomLimit : 0;
};

const scrollPaddingTop = (): number => {
  const padding = Number.parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop);
  return Number.isNaN(padding) ? 0 : padding;
};

/** Barras fixas no rodapé: a de ação do checkout (`data-action-bar`) e a bandeja (`data-bottom-bar`). */
const FIXED_BARS = "[data-action-bar], [data-bottom-bar]";

/** Fim da área útil: o topo da barra fixa mais alta (ação ou bandeja) ou o fim da janela. */
const usableBottom = (): number => {
  const tops = Array.from(document.querySelectorAll(FIXED_BARS))
    .filter((bar) => getComputedStyle(bar).position === "fixed")
    .map((bar) => bar.getBoundingClientRect().top - ACTION_BAR_GAP);
  return tops.length > 0 ? Math.min(window.innerHeight, ...tops) : window.innerHeight;
};

/**
 * Revela um **bloco** (rótulo, campo, descrição e erro; alerta inteiro; título com contador) na área
 * útil: abaixo do header (`scroll-padding-top`) e acima da barra de ação fixa medida no DOM. Só rola
 * quando preciso; instantâneo e sem mexer no foco.
 */
export const revealBlock = (element: Element | null): void => {
  if (!element || typeof window.scrollBy !== "function") return;
  const { top, bottom } = element.getBoundingClientRect();
  const delta = revealDelta({ top, bottom }, scrollPaddingTop(), usableBottom());
  if (delta !== 0) window.scrollBy({ top: delta, behavior: "instant" });
};
