"use client";

import { useRef } from "react";
import { Field, IconButton, Input, MapPinIcon, Spinner, VisuallyHidden, XIcon } from "@/shared/ui";
import { useCombobox } from "../hooks/useCombobox";
import { useDestinationField } from "../hooks/useDestinationField";
import { SuggestionList } from "./SuggestionList";

type DestinationComboboxProps = {
  /** `name` da sugestão escolhida (`""` = nenhuma). */
  value: string;
  onChange: (name: string) => void;
  /** Chamado quando o foco sai do campo (inclui o popover); usado pelo RHF (`onTouched`). */
  onBlur: () => void;
  error?: string | undefined;
  /** Ref do input (o RHF usa para `setFocus`). */
  inputRef?: (element: HTMLInputElement | null) => void;
};

/**
 * Campo "Destino" com autocomplete (ARIA 1.2). O valor do formulário é só o `name` da sugestão
 * escolhida; o texto digitado fica aqui dentro.
 */
export const DestinationCombobox = ({
  value,
  onChange,
  onBlur,
  error,
  inputRef,
}: DestinationComboboxProps) => {
  const elementRef = useRef<HTMLInputElement | null>(null);
  const field = useDestinationField({ selected: value, onSelect: onChange });
  const combobox = useCombobox({
    itemKeys: field.items.map((item) => item.id),
    canOpen: field.hasQuery,
    canActivate: !field.isStale,
    closeOnTab: field.view !== "error",
    onSelect: (index) => {
      const suggestion = field.items[index];
      if (!suggestion) return;
      field.select(suggestion);
      combobox.close();
      elementRef.current?.focus();
    },
    onEscapeClosed: field.clear,
    onLeave: onBlur,
  });

  const clear = () => {
    field.clear();
    combobox.reset();
    elementRef.current?.focus();
  };

  const retry = async (viaKeyboard: boolean) => {
    await field.retry();
    if (viaKeyboard) elementRef.current?.focus();
  };

  const endSlot = field.isLoading ? (
    <span className="px-2.5 text-fg-muted">
      <Spinner className="size-5" />
      <VisuallyHidden>Buscando destinos…</VisuallyHidden>
    </span>
  ) : field.inputValue ? (
    <IconButton
      aria-label="Limpar destino"
      icon={<XIcon className="size-5" />}
      // Safari/iOS/Firefox mac não focam o botão no clique: sem isso o input perderia o foco
      // (blur com relatedTarget nulo) e o erro de "destino vazio" apareceria antes do clear.
      onMouseDown={(event) => event.preventDefault()}
      onClick={clear}
    />
  ) : undefined;

  return (
    <Field label="Destino" required error={error}>
      {(control) => (
        <div className="relative" {...combobox.wrapperProps}>
          <Input
            {...control}
            {...combobox.inputProps}
            ref={(element) => {
              elementRef.current = element;
              inputRef?.(element);
            }}
            value={field.inputValue}
            onChange={(event) => {
              field.change(event.target.value);
              combobox.reset();
              if (event.target.value.trim() !== "") combobox.open();
            }}
            placeholder="Cidade, praia ou ilha"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="search"
            startIcon={<MapPinIcon className="size-5" />}
            endSlot={endSlot}
          />
          <SuggestionList
            view={field.view}
            items={field.items}
            query={field.inputValue}
            combobox={combobox}
            errorMessage={field.errorMessage}
            isRetrying={field.isRetrying}
            onRetry={retry}
          />
          <p className="sr-only" aria-live="polite">
            {field.announcement}
          </p>
        </div>
      )}
    </Field>
  );
};
