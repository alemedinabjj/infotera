"use client";

import type { MouseEvent } from "react";
import type { Suggestion } from "@/shared/api/schemas";
import { AlertCircleIcon, Button, Spinner } from "@/shared/ui";
import type { useCombobox } from "../hooks/useCombobox";
import { SUGGESTIONS_ERROR_MESSAGE, type SuggestionsView } from "../hooks/useDestinationField";
import { SuggestionOption } from "./SuggestionOption";

type Combobox = ReturnType<typeof useCombobox>;

type SuggestionListProps = {
  view: SuggestionsView;
  items: Suggestion[];
  query: string;
  selectedName: string;
  combobox: Combobox;
  isRetrying: boolean;
  onRetry: (viaKeyboard: boolean) => void;
};

const OFFLINE_MESSAGE = "Você está sem internet. Assim que a conexão voltar, tente de novo.";
const STATUS_ROW = "flex min-h-11 items-center gap-3 px-3 py-2 text-sm text-fg-muted";

const ErrorRow = ({ isRetrying, onRetry }: Pick<SuggestionListProps, "isRetrying" | "onRetry">) => (
  <div className={STATUS_ROW}>
    <AlertCircleIcon className="size-5 shrink-0 text-danger" />
    <p className="min-w-0 flex-1 text-fg">
      {navigator.onLine === false ? OFFLINE_MESSAGE : SUGGESTIONS_ERROR_MESSAGE}
    </p>
    <Button
      variant="ghost"
      size="sm"
      loading={isRetrying}
      loadingText="Tentando…"
      onMouseDown={(event: MouseEvent) => event.preventDefault()}
      onClick={(event) => onRetry(event.detail === 0)}
    >
      Tentar de novo
    </Button>
  </div>
);

/** Popover do combobox: opções no `ul` (só `option`) e linhas de status fora dele. */
export const SuggestionList = ({
  view,
  items,
  query,
  selectedName,
  combobox,
  isRetrying,
  onRetry,
}: SuggestionListProps) => (
  <div
    hidden={!combobox.isOpen}
    className="absolute top-full z-10 mt-1 max-h-[min(20rem,50dvh)] w-full animate-fade-in overflow-auto rounded-card border border-border bg-surface p-1 shadow-raised"
  >
    <ul {...combobox.listboxProps} aria-label="Destinos sugeridos" hidden={items.length === 0}>
      {items.map((suggestion, index) => (
        <SuggestionOption
          key={suggestion.id}
          suggestion={suggestion}
          query={query}
          active={index === combobox.activeIndex}
          chosen={suggestion.name === selectedName}
          {...combobox.getOptionProps(index)}
        />
      ))}
    </ul>
    {view === "loading" ? (
      <div className={STATUS_ROW}>
        <Spinner className="size-5" />
        <p>Buscando destinos…</p>
      </div>
    ) : null}
    {view === "empty" ? (
      <div className="min-h-11 px-3 py-2">
        <p className="text-base text-fg">Nenhum destino encontrado para "{query.trim()}"</p>
        <p className="text-sm text-fg-muted">Confira a grafia ou tente o nome da cidade.</p>
      </div>
    ) : null}
    {view === "error" ? <ErrorRow isRetrying={isRetrying} onRetry={onRetry} /> : null}
  </div>
);
