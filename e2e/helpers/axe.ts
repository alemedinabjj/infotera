import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";

/**
 * Espera as animações finitas (fade-in do popover, das mensagens de erro, transições do mapa...)
 * terminarem. O axe calcula contraste com a opacidade do momento: no meio de um fade o texto
 * "clareia" e gera violação falsa, e só sob carga (CPU lenta) a análise pega a animação rodando.
 * Animação que **começa depois** do primeiro instantâneo (efeito disparado por IntersectionObserver,
 * transição de um quadro seguinte) também conta: repete até ficar sem nenhuma por dois quadros
 * seguidos. Animações infinitas (spinner) são ignoradas, senão a espera nunca acabaria.
 */
export const waitForAnimationsToSettle = (page: Page): Promise<void> =>
  page.evaluate(async () => {
    const finite = () =>
      document
        .getAnimations()
        .filter((animation) => animation.effect?.getComputedTiming().iterations !== Infinity);
    const twoFrames = () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      );
    for (let pass = 0; pass < 20; pass++) {
      const running = finite();
      await Promise.all(running.map((animation) => animation.finished.catch(() => undefined)));
      await twoFrames();
      if (running.length === 0 && finite().length === 0) return;
    }
  });

/** Axe WCAG A/AA com a página estável (sem animações em andamento). */
export const analyzeAccessibility = async (page: Page) => {
  await waitForAnimationsToSettle(page);
  return new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
};
