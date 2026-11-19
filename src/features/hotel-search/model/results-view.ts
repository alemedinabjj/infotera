import { getTotalPages } from "@/shared/lib/pagination";
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

/** `Nenhum hotel encontrado` · `1 hotel encontrado` · `14 hotéis encontrados`. */
export const describeResultCount = (total: number): string => {
  if (total <= 0) return "Nenhum hotel encontrado";
  if (total === 1) return "1 hotel encontrado";
  return `${total.toLocaleString("pt-BR")} hotéis encontrados`;
};

/** Complemento só para leitor de tela: `, página 2 de 2` (vazio com 1 página). */
export const describePageSuffix = (page: number, total: number): string => {
  const totalPages = getTotalPages(total, PAGE_SIZE);
  return totalPages > 1 ? `, página ${page} de ${totalPages}` : "";
};

/** `Mostrando 11–14 de 14`. */
export const describeVisibleRange = (page: number, total: number): string => {
  const first = (page - 1) * PAGE_SIZE + 1;
  const last = Math.min(page * PAGE_SIZE, total);
  return `Mostrando ${first}–${last} de ${total.toLocaleString("pt-BR")}`;
};

type AnnouncementInput = { view: ResultsView; slow: boolean; total: number; destination: string };

/**
 * Texto do anunciador `aria-live`: carregando → demorando → resultado. Erro, offline e troca em
 * andamento (stale) não anunciam (o `ErrorState` é `role="alert"`; o dado novo é anunciado ao chegar).
 */
export const describeAnnouncement = ({
  view,
  slow,
  total,
  destination,
}: AnnouncementInput): string => {
  switch (view.kind) {
    case "loading":
      return slow ? "Está demorando mais que o normal…" : "Carregando hotéis…";
    case "results":
      return view.stale ? "" : describeResultCount(total);
    case "empty-filters":
      return "Nenhum hotel com esses filtros";
    case "empty-destination":
      return `Nenhum hotel em ${destination}`;
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

type ToolbarInput = { view: ResultsView; slow: boolean; total: number; page: number };

/** Título (h2, alvo de foco) e linha de status da toolbar para cada visão. */
export const describeToolbar = ({
  view,
  slow,
  total,
  page,
}: ToolbarInput): { heading: ToolbarHeading; status: ToolbarStatus } => {
  switch (view.kind) {
    case "loading":
    case "out-of-range":
      return {
        heading: { kind: "skeleton" },
        status: {
          kind: "spinner",
          text: slow ? "Está demorando mais que o normal…" : "Carregando hotéis…",
        },
      };
    case "results":
      return {
        heading: {
          kind: "text",
          text: describeResultCount(total),
          srSuffix: describePageSuffix(page, total),
        },
        status: view.stale
          ? { kind: "spinner", text: "Atualizando resultados…" }
          : { kind: "text", text: describeVisibleRange(page, total) },
      };
    case "empty-destination":
    case "empty-filters":
      return {
        heading: { kind: "text", text: "Nenhum hotel encontrado", srSuffix: "" },
        status: { kind: "none" },
      };
    case "error":
    case "offline":
      return {
        heading: { kind: "text", text: "Resultados indisponíveis", srSuffix: "" },
        status: { kind: "none" },
      };
    default: {
      const unreachable: never = view;
      return unreachable;
    }
  }
};
