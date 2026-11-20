/**
 * Abertura da foto a partir do link da galeria, antes de a rota responder.
 * `opening`: a navegação saiu e o modal de carregamento já está na tela; `offline`: o clique nem
 * navegou. `from` é o caminho em que começou: quando o caminho muda, a rota assumiu o lugar.
 */
export type PhotoOpening =
  | { phase: "idle" }
  | { phase: "opening" | "offline"; from: string; dismissed: boolean };

export const IDLE_OPENING: PhotoOpening = { phase: "idle" };

/** Fase visível agora: some se a pessoa fechou ou quando o caminho muda (a rota chegou). */
export const visiblePhase = (opening: PhotoOpening, pathname: string): PhotoOpening["phase"] =>
  opening.phase !== "idle" && !opening.dismissed && opening.from === pathname
    ? opening.phase
    : "idle";

/** A rota respondeu (o caminho mudou) para uma abertura ainda pendente. */
export const hasArrived = (opening: PhotoOpening, pathname: string): boolean =>
  opening.phase !== "idle" && opening.from !== pathname;

/** Chegou depois de a pessoa fechar o carregamento: a rota não deve ficar aberta. */
export const arrivedAfterDismiss = (opening: PhotoOpening, pathname: string): boolean =>
  hasArrived(opening, pathname) && opening.phase === "opening" && opening.dismissed;

/** Clique que o navegador trata sozinho (nova aba/janela, botão do meio): nada para abrir aqui. */
export const isModifiedClick = (event: {
  button: number;
  metaKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
}): boolean =>
  event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
