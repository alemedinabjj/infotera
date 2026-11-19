import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import type { Suggestion } from "@/shared/api/schemas";
import { useDebouncedValue } from "@/shared/hooks/useDebouncedValue";
import { suggestionsQueryOptions } from "../api/suggestions";
import { normalizeQuery } from "../model/suggestion-text";
import {
  deriveSuggestionsView,
  describeSuggestionsAnnouncement,
  suggestionsErrorMessage,
} from "../model/suggestions-view";
import { useOnline } from "./useOnline";

const MIN_QUERY_LENGTH = 2;

type Options = {
  /** `name` da sugestão escolhida (`""` = nenhuma). */
  selected: string;
  onSelect: (name: string) => void;
};

type SuggestionsStateOptions = { inputValue: string; selected: string };

/** Query de sugestões (debounce 300 ms, offline, retry) → visão do popover e opções. */
const useSuggestionsState = ({ inputValue, selected }: SuggestionsStateOptions) => {
  const online = useOnline();
  // Chave normalizada da query em retry: some sozinha quando a pessoa muda o texto.
  const [retryingKey, setRetryingKey] = useState<string | null>(null);
  const debounced = useDebouncedValue(inputValue);
  const isSelectedText = inputValue !== "" && inputValue === selected;
  const hasQuery = !isSelectedText && normalizeQuery(inputValue).length >= MIN_QUERY_LENGTH;
  const isDebouncing = hasQuery && normalizeQuery(inputValue) !== normalizeQuery(debounced);
  const queryText = normalizeQuery(debounced);
  const query = useQuery(suggestionsQueryOptions(hasQuery ? debounced : ""));
  const isRetrying = retryingKey !== null && retryingKey === queryText;
  const offline = !online || query.fetchStatus === "paused";

  const view = deriveSuggestionsView({
    hasQuery,
    isDebouncing,
    isError: query.isError,
    isRetrying,
    isFetching: query.isFetching,
    isPlaceholderData: query.isPlaceholderData,
    hasData: query.data !== undefined,
    itemCount: query.data?.length ?? 0,
    offline,
  });
  // Só a visão "results" mostra opções (offline/erro nunca exibem a lista de outra query).
  const items: Suggestion[] = view === "results" ? (query.data ?? []) : [];

  return {
    hasQuery,
    items,
    view,
    isLoading: hasQuery && (query.isFetching || isDebouncing) && !offline,
    announcement: describeSuggestionsAnnouncement({
      view,
      offline,
      itemCount: items.length,
      text: inputValue,
      isCurrent: !query.isFetching && !query.isPlaceholderData && !isDebouncing,
    }),
    errorMessage: suggestionsErrorMessage(offline),
    isRetrying,
    /** A lista é de outra busca (`keepPreviousData`): teclado não ativa opções. */
    isStale: query.isPlaceholderData,
    retry: async () => {
      setRetryingKey(queryText);
      try {
        await query.refetch();
      } finally {
        setRetryingKey(null);
      }
    },
  };
};

/**
 * Texto do destino + seleção + busca de sugestões (debounce de 300 ms). O texto digitado é
 * separado do valor selecionado: digitar desfaz a seleção, escolher define os dois.
 */
export const useDestinationField = ({ selected, onSelect }: Options) => {
  const [inputValue, setInputValue] = useState(selected);
  const [syncedSelected, setSyncedSelected] = useState(selected);
  if (selected !== syncedSelected) {
    // Seleção mudou por fora (ex.: restaurar busca recente): o texto acompanha.
    setSyncedSelected(selected);
    if (selected !== "" && selected !== inputValue) setInputValue(selected);
  }
  const suggestions = useSuggestionsState({ inputValue, selected });

  return {
    ...suggestions,
    inputValue,
    change: (text: string) => {
      setInputValue(text);
      if (selected !== "") onSelect("");
    },
    select: (suggestion: Suggestion) => {
      setInputValue(suggestion.name);
      onSelect(suggestion.name);
    },
    clear: () => {
      setInputValue("");
      if (selected !== "") onSelect("");
    },
  };
};
