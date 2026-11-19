import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import type { Suggestion } from "@/shared/api/schemas";
import { suggestionsQueryOptions } from "../api/suggestions";
import { describeResultCount, normalizeQuery } from "../model/suggestion-text";
import { useDebouncedValue } from "./useDebouncedValue";
import { useOnline } from "./useOnline";

const MIN_QUERY_LENGTH = 2;
const SUGGESTIONS_ERROR_MESSAGE = "Não foi possível carregar os destinos.";
const OFFLINE_MESSAGE = "Você está sem internet. Assim que a conexão voltar, tente de novo.";

export const suggestionsErrorMessage = (online: boolean): string =>
  online ? SUGGESTIONS_ERROR_MESSAGE : OFFLINE_MESSAGE;

export type SuggestionsView = "loading" | "results" | "empty" | "error";

type Options = {
  /** `name` da sugestão escolhida (`""` = nenhuma). */
  selected: string;
  onSelect: (name: string) => void;
};

/**
 * Texto do destino + seleção + busca de sugestões (debounce de 300 ms). O texto digitado é
 * separado do valor selecionado: digitar desfaz a seleção, escolher define os dois.
 */
export const useDestinationField = ({ selected, onSelect }: Options) => {
  const [inputValue, setInputValue] = useState(selected);
  const online = useOnline();
  const [isRetrying, setIsRetrying] = useState(false);
  const [syncedSelected, setSyncedSelected] = useState(selected);
  if (selected !== syncedSelected) {
    // Seleção mudou por fora (ex.: restaurar busca recente): o texto acompanha.
    setSyncedSelected(selected);
    if (selected !== "" && selected !== inputValue) setInputValue(selected);
  }

  const debounced = useDebouncedValue(inputValue);
  const isSelectedText = inputValue !== "" && inputValue === selected;
  const hasQuery = !isSelectedText && normalizeQuery(inputValue).length >= MIN_QUERY_LENGTH;
  const isDebouncing = hasQuery && normalizeQuery(inputValue) !== normalizeQuery(debounced);
  const query = useQuery(suggestionsQueryOptions(hasQuery ? debounced : ""));

  const items: Suggestion[] = hasQuery ? (query.data ?? []) : [];
  const isLoading = hasQuery && (query.isFetching || isDebouncing);
  const isSettled = hasQuery && !isLoading && !query.isPlaceholderData && query.data !== undefined;
  const view = ((): SuggestionsView => {
    if (hasQuery && (query.isError || isRetrying) && !isDebouncing) return "error";
    if (items.length > 0) return "results";
    return isSettled ? "empty" : "loading";
  })();

  const announcement = ((): string => {
    if (view === "error") return suggestionsErrorMessage(online);
    return isSettled && (view === "results" || view === "empty")
      ? describeResultCount(items.length, inputValue)
      : "";
  })();

  return {
    inputValue,
    hasQuery,
    items,
    view,
    isLoading,
    announcement,
    errorMessage: suggestionsErrorMessage(online),
    isRetrying,
    retry: async () => {
      setIsRetrying(true);
      try {
        await query.refetch();
      } finally {
        setIsRetrying(false);
      }
    },
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
