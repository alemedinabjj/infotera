import { DEFAULT_LOCALE, type Locale } from "@/shared/i18n/config";
import { hotelSearchMessages } from "../i18n/messages";
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
  locale?: Locale;
};

const pluralLoaded = (count: number, locale: Locale): string => {
  const t = hotelSearchMessages.get(locale).feed;
  return count === 1 ? t.addedOne : t.addedMany({ count });
};

/**
 * Texto do anunciador do feed quando o lote chega: `Mais 4 hotéis carregados. Mostrando 14 de 14.`.
 * Vazio se não há nada novo a dizer (a contagem inicial e o erro — `role="alert"` — têm anúncio
 * próprio; durante o lote quem fala é o botão).
 */
export const describeFeedAnnouncement = ({
  previousLoaded,
  loaded,
  total,
  footer,
  locale = DEFAULT_LOCALE,
}: AnnouncementInput): string => {
  switch (footer.kind) {
    // "Carregando mais hotéis…" já é lido pelo botão (`aria-live`/estado): sem anúncio duplicado.
    case "loading-more":
    case "error-more":
      return "";
    case "more":
    case "end": {
      const added = loaded - previousLoaded;
      if (previousLoaded <= 0 || added <= 0) return "";
      return `${pluralLoaded(added, locale)}. ${hotelSearchMessages.get(locale).feed.showing({ loaded, total })}`;
    }
    default: {
      const unreachable: never = footer;
      return unreachable;
    }
  }
};

/** Fotografia do feed para o anúncio: de qual consulta (`key`), quantos lotes e hotéis. */
export type AnnouncementSnapshot = {
  key: string;
  batches: number;
  loaded: number;
  /** Hotéis antes do último lote (igual a `loaded` quando não há nada novo a anunciar). */
  previousLoaded: number;
};

type FeedProgress = Pick<AnnouncementSnapshot, "key" | "batches" | "loaded">;

/**
 * Próxima fotografia. Só há "lote novo" quando o nº de lotes cresce DENTRO da mesma consulta:
 * trocar de filtro (4 -> 7 hotéis) não é "Mais 3 hotéis carregados".
 */
export const nextAnnouncementSnapshot = (
  previous: AnnouncementSnapshot,
  progress: FeedProgress,
): AnnouncementSnapshot => {
  if (
    previous.key === progress.key &&
    previous.batches === progress.batches &&
    previous.loaded === progress.loaded
  ) {
    return previous;
  }
  const grew = previous.key === progress.key && progress.batches > previous.batches;
  return { ...progress, previousLoaded: grew ? previous.loaded : progress.loaded };
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
