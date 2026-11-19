import { describeResultCount } from "./suggestion-text";

/** O que o popover mostra: nada (`idle`), carregando, lista, vazio ou erro (inclui offline). */
export type SuggestionsView = "idle" | "loading" | "results" | "empty" | "error";

export type SuggestionsViewInput = {
  /** Texto com caracteres suficientes e que não é o destino já escolhido. */
  hasQuery: boolean;
  /** O texto digitado ainda não virou a chave da query (debounce). */
  isDebouncing: boolean;
  isError: boolean;
  isRetrying: boolean;
  isFetching: boolean;
  /** A lista em mãos é de outra query (`keepPreviousData`). */
  isPlaceholderData: boolean;
  hasData: boolean;
  itemCount: number;
  /** Sem internet (`navigator.onLine` falso ou query pausada). */
  offline: boolean;
};

const ERROR_MESSAGE = "Não foi possível carregar os destinos.";
const OFFLINE_MESSAGE = "Você está sem internet. Assim que a conexão voltar, tente de novo.";

export const suggestionsErrorMessage = (offline: boolean): string =>
  offline ? OFFLINE_MESSAGE : ERROR_MESSAGE;

/**
 * Decide a visão do popover. Offline sem dados da busca atual vira erro (linha offline) e nunca
 * mostra a lista de outra query; falha durante o debounce não aparece (a chave vai mudar).
 */
export const deriveSuggestionsView = (input: SuggestionsViewInput): SuggestionsView => {
  if (!input.hasQuery) return "idle";
  const hasOwnData = input.hasData && !input.isPlaceholderData && !input.isDebouncing;
  if (input.offline && !hasOwnData) return "error";
  if ((input.isError || input.isRetrying) && !input.isDebouncing) return "error";
  if (input.itemCount > 0) return "results";
  const isSettled =
    !input.isFetching && !input.isDebouncing && !input.isPlaceholderData && input.hasData;
  return isSettled ? "empty" : "loading";
};

type AnnouncementInput = {
  view: SuggestionsView;
  offline: boolean;
  itemCount: number;
  text: string;
  /** A lista já é a da busca atual (nada em andamento, nem placeholder). */
  isCurrent: boolean;
};

/** Texto da região `aria-live` do combobox: erro/offline, contagem de resultados ou nada. */
export const describeSuggestionsAnnouncement = (input: AnnouncementInput): string => {
  if (input.view === "error") return suggestionsErrorMessage(input.offline);
  const hasOutcome = input.view === "results" || input.view === "empty";
  return hasOutcome && input.isCurrent ? describeResultCount(input.itemCount, input.text) : "";
};
