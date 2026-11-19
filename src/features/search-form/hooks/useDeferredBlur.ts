import { type RefObject, useCallback, useEffect, useRef } from "react";

/** Se o `click` não vier (soltou fora do botão, gesto cancelado), a validação roda depois disso. */
const RELEASE_FALLBACK_MS = 400;

const isButtonTarget = (target: EventTarget | null): boolean =>
  target instanceof Element && target.closest("button") !== null;

/**
 * Adia a validação do blur enquanto a pessoa está pressionando um botão do `container`.
 *
 * Sem isso, o mousedown tira o foco do campo, o erro do blur aparece, o layout desce e o mouseup
 * cai fora do botão: o `click` nunca dispara e o usuário precisa clicar de novo. Aqui o blur
 * fica pendente (`defer`) e só roda depois do `click` (ou, se ele não vier, 400 ms após soltar).
 * Teclado e cliques fora de botões validam na hora, como sempre.
 *
 * @returns `defer(run)` para envolver o `onBlur` de cada campo e `cancel()` para descartar o que
 * estiver pendente (ex.: o formulário foi restaurado e a validação ficou obsoleta).
 */
export const useDeferredBlur = (container: RefObject<HTMLElement | null>) => {
  const isPressing = useRef(false);
  const pending = useRef<(() => void)[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const cancel = useCallback(() => {
    clearTimeout(timer.current);
    isPressing.current = false;
    pending.current = [];
  }, []);

  const defer = useCallback((run: () => void) => {
    if (isPressing.current) pending.current.push(run);
    else run();
  }, []);

  useEffect(() => {
    const element = container.current;
    if (!element) return;

    const flush = () => {
      isPressing.current = false;
      const queued = pending.current;
      pending.current = [];
      for (const run of queued) run();
    };
    const flushAfter = (delay: number) => {
      clearTimeout(timer.current);
      timer.current = setTimeout(flush, delay);
    };

    const onDown = (event: Event) => {
      if (!isButtonTarget(event.target)) {
        if (isPressing.current) flushAfter(0); // outro gesto começou: não deixa nada preso
        return;
      }
      clearTimeout(timer.current);
      isPressing.current = true;
    };
    // O `click` chega logo depois do mouseup/touchend; o timeout 0 deixa os handlers dele rodarem antes.
    const onClick = () => {
      if (isPressing.current) flushAfter(0);
    };
    const onRelease = () => {
      if (isPressing.current) flushAfter(RELEASE_FALLBACK_MS);
    };

    // Soltar pode acontecer fora do container: o fim do gesto é ouvido no documento.
    const doc = element.ownerDocument;
    element.addEventListener("pointerdown", onDown, true);
    element.addEventListener("click", onClick, true);
    doc.addEventListener("pointerup", onRelease, true);
    doc.addEventListener("pointercancel", onRelease, true);
    return () => {
      element.removeEventListener("pointerdown", onDown, true);
      element.removeEventListener("click", onClick, true);
      doc.removeEventListener("pointerup", onRelease, true);
      doc.removeEventListener("pointercancel", onRelease, true);
      clearTimeout(timer.current);
    };
  }, [container]);

  return { defer, cancel };
};
