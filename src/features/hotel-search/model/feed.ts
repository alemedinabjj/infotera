/** Rodapé do feed (rolagem contínua), um estado por vez. */
export type FeedFooter =
  | { kind: "more" }
  | { kind: "loading-more" }
  | { kind: "error-more" }
  | { kind: "end"; total: number };

type FooterInput = {
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  isFetchNextPageError: boolean;
  total: number;
};

/**
 * Estado do rodapé. O erro vem antes de "carregando": em "Tentar de novo" o TanStack mantém o
 * erro até o lote chegar, e o botão fica em `Tentando…` no mesmo lugar (nada se move).
 */
export const deriveFeedFooter = ({
  hasNextPage,
  isFetchingNextPage,
  isFetchNextPageError,
  total,
}: FooterInput): FeedFooter => {
  if (isFetchNextPageError) return { kind: "error-more" };
  if (isFetchingNextPage) return { kind: "loading-more" };
  if (hasNextPage) return { kind: "more" };
  return { kind: "end", total };
};

type AnnouncementInput = {
  /** Quantos hotéis estavam carregados antes do último lote. */
  previousLoaded: number;
  loaded: number;
  total: number;
  footer: FeedFooter;
};

const pluralLoaded = (count: number): string =>
  count === 1 ? "Mais 1 hotel carregado" : `Mais ${count} hotéis carregados`;

/**
 * Texto do anunciador do feed: `Carregando mais hotéis…` durante o lote e, quando chega,
 * `Mais 4 hotéis carregados. Mostrando 14 de 14.`. Vazio se não há nada novo a dizer (a contagem
 * inicial e o erro — `role="alert"` — têm anúncio próprio).
 */
export const describeFeedAnnouncement = ({
  previousLoaded,
  loaded,
  total,
  footer,
}: AnnouncementInput): string => {
  switch (footer.kind) {
    case "loading-more":
      return "Carregando mais hotéis…";
    case "error-more":
      return "";
    case "more":
    case "end": {
      const added = loaded - previousLoaded;
      if (previousLoaded <= 0 || added <= 0) return "";
      return `${pluralLoaded(added)}. Mostrando ${loaded.toLocaleString("pt-BR")} de ${total.toLocaleString("pt-BR")}.`;
    }
    default: {
      const unreachable: never = footer;
      return unreachable;
    }
  }
};

/** Garante que o índice com foco continua na janela virtual (senão o foco cairia no `body`). */
export const withPinnedIndex = (indexes: number[], pinned: number | null): number[] => {
  if (pinned === null || indexes.includes(pinned)) return indexes;
  return [...indexes, pinned].sort((a, b) => a - b);
};

/** Para onde o foco vai com uma tecla no feed (padrão APG). */
export type FeedKeyTarget =
  | { kind: "item"; index: number }
  | { kind: "after" }
  | { kind: "before" }
  | null;

type FeedKeyInput = {
  key: string;
  ctrlKey: boolean;
  /** Índice do card com foco. */
  current: number;
  count: number;
};

/** `PageDown`/`PageUp` entre cards, `Ctrl+End` para depois do feed e `Ctrl+Home` para o título. */
export const feedKeyTarget = ({ key, ctrlKey, current, count }: FeedKeyInput): FeedKeyTarget => {
  if (ctrlKey) {
    if (key === "End") return { kind: "after" };
    if (key === "Home") return { kind: "before" };
    return null;
  }
  if (key === "PageDown") return current + 1 < count ? { kind: "item", index: current + 1 } : null;
  if (key === "PageUp") return current > 0 ? { kind: "item", index: current - 1 } : null;
  return null;
};
