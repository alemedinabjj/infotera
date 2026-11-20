import { revealBlock } from "./scroll";

/** Por quanto tempo o bloco acompanha o layout que ainda muda (dados que chegam depois do foco). */
export const SETTLE_MS = 1500;

/** Gestos da pessoa que encerram o acompanhamento: a rolagem dela vale mais que a nossa. */
const USER_EVENTS = ["wheel", "touchstart", "pointerdown", "keydown"] as const;

const FIXED_BARS = "[data-action-bar], [data-bottom-bar]";

/**
 * Mantém o bloco revelado (`revealBlock`) enquanto o layout em volta ainda muda. Um dado que chega
 * **depois** de o foco ter revelado o bloco (resumo da reserva que troca o skeleton pelo conteúdo,
 * total que cresce a barra fixa) empurra o bloco de volta para baixo do header ou da barra. Observa o
 * `<body>` e as barras fixas: a cada mudança de tamanho revela de novo, só se preciso. Termina em
 * `SETTLE_MS` ou no primeiro gesto da pessoa (rolagem, toque, tecla). Devolve a função que encerra.
 */
export const keepBlockRevealed = (element: Element | null): (() => void) => {
  if (!element || typeof ResizeObserver === "undefined") return () => undefined;
  const observer = new ResizeObserver(() => {
    if (element.isConnected) revealBlock(element);
  });
  observer.observe(document.body);
  for (const bar of document.querySelectorAll(FIXED_BARS)) observer.observe(bar);

  const stop = () => {
    observer.disconnect();
    window.clearTimeout(timer);
    for (const name of USER_EVENTS) window.removeEventListener(name, stop);
  };
  const timer = window.setTimeout(stop, SETTLE_MS);
  for (const name of USER_EVENTS) window.addEventListener(name, stop, { passive: true });
  return stop;
};
