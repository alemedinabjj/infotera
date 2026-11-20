import type { Locale } from "@/shared/i18n/config";
import { getTotalPages } from "@/shared/lib/pagination";
import { hotelSearchMessages } from "../i18n/messages";
import { PAGE_SIZE } from "./search-filters";

/** Fatos da query que decidem o que a seção de resultados mostra. */
export type ResultsViewInput = {
  /** Há dados (da chave atual ou `placeholderData` da anterior). */
  hasData: boolean;
  isError: boolean;
  /** Os dados são da chave anterior (troca de filtro/página em andamento). */
  isPlaceholderData: boolean;
  /** `fetchStatus === "paused"`: sem rede. */
  isPaused: boolean;
  total: number;
  page: number;
  hasActiveFilters: boolean;
};

export type ResultsView =
  | { kind: "loading" }
  | { kind: "offline" }
  | { kind: "error" }
  | { kind: "empty-destination" }
  | { kind: "empty-filters" }
  | { kind: "out-of-range"; lastPage: number }
  | { kind: "results"; stale: boolean; offlineWithData: boolean };

/** Última página válida quando `page` passou do fim (com total > 0); senão `null`. */
export const outOfRangePage = (page: number, total: number): number | null => {
  const totalPages = getTotalPages(total, PAGE_SIZE);
  return total > 0 && page > totalPages ? totalPages : null;
};

/**
 * Estado da tela a partir dos fatos da query. Dados de OUTRA chave (placeholder) nunca aparecem
 * em erro ou offline: a lista dos filtros antigos não pode ficar sob os controles novos.
 */
export const deriveResultsView = (input: ResultsViewInput): ResultsView => {
  const { hasData, isError, isPlaceholderData, isPaused, total, page, hasActiveFilters } = input;
  const ownData = hasData && !isPlaceholderData;

  if (!ownData) {
    if (isError) return { kind: "error" };
    if (isPaused) return { kind: "offline" };
  }
  if (!hasData) return { kind: "loading" };
  if (total === 0) {
    // Zero da busca anterior não diz nada sobre a nova: espera o dado novo.
    if (isPlaceholderData) return { kind: "loading" };
    return { kind: hasActiveFilters ? "empty-filters" : "empty-destination" };
  }
  const lastPage = outOfRangePage(page, total);
  if (lastPage !== null && !isPlaceholderData) return { kind: "out-of-range", lastPage };
  return { kind: "results", stale: isPlaceholderData, offlineWithData: ownData && isPaused };
};

const msgs = (locale: Locale) => hotelSearchMessages.get(locale).list;

/** `Nenhum hotel encontrado` · `1 hotel encontrado` · `14 hotéis encontrados`. */
export const describeResultCount = (total: number, locale: Locale): string => {
  if (total <= 0) return msgs(locale).none;
  if (total === 1) return msgs(locale).one;
  return msgs(locale).many({ count: total });
};

/** `Mostrando 10 de 14` (feed: sem faixa nem página). */
export const describeLoadedCount = (loaded: number, total: number, locale: Locale): string =>
  msgs(locale).loaded({ loaded, total });

/** Complemento só para leitor de tela: `, página 2 de 2` (vazio com 1 página). */
export const describePageSuffix = (page: number, total: number, locale: Locale): string => {
  const totalPages = getTotalPages(total, PAGE_SIZE);
  return totalPages > 1 ? msgs(locale).pageSuffix({ page, total: totalPages }) : "";
};

/** `Mostrando 11–14 de 14`. */
export const describeVisibleRange = (page: number, total: number, locale: Locale): string => {
  const first = (page - 1) * PAGE_SIZE + 1;
  const last = Math.min(page * PAGE_SIZE, total);
  return msgs(locale).range({ first, last, total });
};

type AnnouncementInput = {
  view: ResultsView;
  slow: boolean;
  total: number;
  destination: string;
  locale: Locale;
};

/**
 * Texto do anunciador `aria-live`: carregando → demorando → resultado. Erro, offline e troca em
 * andamento (stale) não anunciam (o `ErrorState` é `role="alert"`; o dado novo é anunciado ao chegar).
 */
export const describeAnnouncement = ({
  view,
  slow,
  total,
  destination,
  locale,
}: AnnouncementInput): string => {
  const t = msgs(locale);
  switch (view.kind) {
    case "loading":
      return slow ? t.slow : t.loading;
    case "results":
      return view.stale ? "" : describeResultCount(total, locale);
    case "empty-filters":
      return t.emptyFilters;
    case "empty-destination":
      return t.emptyDestination({ destination });
    case "error":
    case "offline":
    case "out-of-range":
      return "";
    default: {
      const unreachable: never = view;
      return unreachable;
    }
  }
};

export type ToolbarHeading =
  | { kind: "skeleton" }
  | { kind: "text"; text: string; srSuffix: string };
export type ToolbarStatus =
  | { kind: "none" }
  | { kind: "text"; text: string }
  | { kind: "spinner"; text: string };

/** Como a lista está sendo mostrada: por página, ou acumulada (feed) com `loaded` hotéis. */
export type Listing = { mode: "pages"; page: number } | { mode: "infinite"; loaded: number };

type ToolbarInput = {
  view: ResultsView;
  slow: boolean;
  total: number;
  listing: Listing;
  locale: Locale;
};

/** Sufixo de página (só leitor de tela) e linha de status do resultado, por modo. */
const describeListing = (
  listing: Listing,
  total: number,
  locale: Locale,
): { srSuffix: string; statusText: string } =>
  listing.mode === "pages"
    ? {
        srSuffix: describePageSuffix(listing.page, total, locale),
        statusText: describeVisibleRange(listing.page, total, locale),
      }
    : { srSuffix: "", statusText: describeLoadedCount(listing.loaded, total, locale) };

/** Título (h2, alvo de foco) e linha de status da toolbar para cada visão. */
export const describeToolbar = ({
  view,
  slow,
  total,
  listing,
  locale,
}: ToolbarInput): { heading: ToolbarHeading; status: ToolbarStatus } => {
  const t = msgs(locale);
  switch (view.kind) {
    case "loading":
    case "out-of-range":
      return {
        heading: { kind: "skeleton" },
        status: {
          kind: "spinner",
          text: slow ? t.slow : t.loading,
        },
      };
    case "results": {
      const { srSuffix, statusText } = describeListing(listing, total, locale);
      return {
        heading: { kind: "text", text: describeResultCount(total, locale), srSuffix },
        status: view.stale
          ? { kind: "spinner", text: t.updatingResults }
          : { kind: "text", text: statusText },
      };
    }
    case "empty-destination":
    case "empty-filters":
      return {
        heading: { kind: "text", text: t.none, srSuffix: "" },
        status: { kind: "none" },
      };
    case "error":
    case "offline":
      return {
        heading: { kind: "text", text: t.unavailable, srSuffix: "" },
        status: { kind: "none" },
      };
    default: {
      const unreachable: never = view;
      return unreachable;
    }
  }
};

export type SheetAction = { text: string; updating: boolean };

/**
 * Rótulo do botão primário do sheet de filtros: `Ver 14 hotéis`, `Ver 1 hotel`, `Ver resultados`
 * (0 resultados, erro, offline) e `Atualizando…` enquanto a lista troca (continua clicável).
 */
export const describeSheetAction = (
  view: ResultsView,
  total: number,
  locale: Locale,
): SheetAction => {
  const t = msgs(locale);
  switch (view.kind) {
    case "loading":
    case "out-of-range":
      return { text: t.sheetUpdating, updating: true };
    case "results":
      if (view.stale) return { text: t.sheetUpdating, updating: true };
      return {
        text: total === 1 ? t.sheetOne : t.sheetMany({ count: total }),
        updating: false,
      };
    case "empty-destination":
    case "empty-filters":
    case "error":
    case "offline":
      return { text: t.sheetSee, updating: false };
    default: {
      const unreachable: never = view;
      return unreachable;
    }
  }
};
