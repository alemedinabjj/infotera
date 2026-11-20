const MAX_FRAMES = 12;

/**
 * Foca o alvo assim que o navegador deixar: um controle que acabou de sair de `invisible`/`inert`
 * pode demorar alguns quadros para ser focável (com `prefers-reduced-motion`, a regra global de
 * `transition-duration` atrasa a mudança de `visibility`). Tenta a cada quadro até conseguir
 * (no máximo 12) e devolve o cancelamento.
 */
export const focusWhenReady = (
  getTarget: () => HTMLElement | null,
  onDone: () => void,
): (() => void) => {
  let frame = 0;
  let tries = 0;
  const attempt = () => {
    const target = getTarget();
    target?.focus();
    tries += 1;
    if ((target && document.activeElement === target) || tries >= MAX_FRAMES) {
      onDone();
      return;
    }
    frame = requestAnimationFrame(attempt);
  };
  frame = requestAnimationFrame(attempt);
  return () => cancelAnimationFrame(frame);
};
