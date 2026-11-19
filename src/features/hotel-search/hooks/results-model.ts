import type { Hotel } from "@/shared/api/schemas";
import type { GeoPoint } from "../model/distance";
import type { FeedFooter } from "../model/feed";
import type { ResultsView } from "../model/results-view";

/** Estado exclusivo da rolagem contínua. */
export type FeedState = {
  footer: FeedFooter;
  /** Hotéis carregados até agora (todos os lotes). */
  loaded: number;
  /** Um lote está sendo buscado (inclusive o "Tentar de novo" depois de um erro). */
  isFetchingNextPage: boolean;
  /** Pede o próximo lote (também é o "Tentar de novo" do rodapé). */
  loadMore: () => void;
};

/** O que a seção de resultados precisa, venha da lista paginada ou do feed. */
export type ResultsModel = {
  view: ResultsView;
  items: Hotel[];
  total: number;
  /** Centroide do destino (`null` sem ele). */
  center: GeoPoint | null;
  /** Está carregando demais (> 5 s). */
  slow: boolean;
  retry: () => void;
  /** Um refetch está em andamento (alimenta "Tentando…" e o botão do sheet). */
  isFetching: boolean;
  /** `null` no modo "Em páginas". */
  feed: FeedState | null;
};

type FailureInput = { hasData: boolean; isError: boolean; errorUpdateCount: number };

/**
 * No TanStack v5 o refetch de uma query sem dados volta a `pending`: sem isto o erro sumiria
 * (e o botão com ele) no clique de "Tentar de novo". Segue em erro até chegar dado.
 */
export const hasFailed = ({ hasData, isError, errorUpdateCount }: FailureInput): boolean =>
  isError || (!hasData && errorUpdateCount > 0);
