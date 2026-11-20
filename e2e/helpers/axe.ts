import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";

/**
 * Espera as animações finitas (fade-in do popover, das mensagens de erro, transições do mapa...)
 * terminarem. O axe calcula contraste com a opacidade do momento: no meio de um fade o texto
 * "clareia" e gera violação falsa, e só sob carga (CPU lenta) a análise pega a animação rodando.
 * Animação que **começa depois** do primeiro instantâneo (efeito disparado por IntersectionObserver,
 * transição de um quadro seguinte) também conta: repete até ficar sem nenhuma por dois quadros
 * seguidos. Só entram as que estão `running` (pausadas, ociosas ou agendadas com atraso não
 * alteram a cor) e as infinitas (spinner) são ignoradas, senão a espera nunca acabaria. Se as
 * passadas acabarem com animação ainda rodando, lança um erro que as lista.
 */
export const waitForAnimationsToSettle = (page: Page): Promise<void> =>
  page.evaluate(async () => {
    const running = () =>
      document
        .getAnimations()
        .filter(
          (animation) =>
            animation.playState === "running" &&
            animation.effect?.getComputedTiming().iterations !== Infinity,
        );
    const twoFrames = () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      );
    const describe = (animation: Animation): string => {
      const target = animation.effect instanceof KeyframeEffect ? animation.effect.target : null;
      const name = animation instanceof CSSAnimation ? animation.animationName : animation.id;
      return `${target?.tagName.toLowerCase() ?? "?"}${target?.id ? `#${target.id}` : ""} (${name || "sem nome"})`;
    };
    for (let pass = 0; pass < 20; pass++) {
      const current = running();
      await Promise.all(current.map((animation) => animation.finished.catch(() => undefined)));
      await twoFrames();
      if (current.length === 0 && running().length === 0) return;
    }
    throw new Error(
      `Animações ainda rodando após 20 passadas: ${running().map(describe).join(", ")}`,
    );
  });

/** Tags do axe usadas em todo o E2E: WCAG 2.0, 2.1 e 2.2 nível A/AA (um lugar só). */
export const AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"];

/** Axe WCAG A/AA com a página estável (sem animações em andamento). */
export const analyzeAccessibility = async (page: Page) => {
  await waitForAnimationsToSettle(page);
  return new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
};
