"use client";

import { Controller, FormProvider } from "react-hook-form";
import type { SearchCriteria } from "@/shared/lib/search-params";
import { Button, ErrorSummary, SearchIcon, toast } from "@/shared/ui";
import { useSearchForm } from "../hooks/useSearchForm";
import { DateRangeFields } from "./DateRangeFields";
import { DestinationCombobox } from "./DestinationCombobox";
import { GuestsPicker } from "./GuestsPicker";
import { RecentSearches } from "./RecentSearches";

type SearchFormProps = {
  /**
   * Preenche o que vier (o resto fica nos padrões) e trata o destino presente como já escolhido
   * (ex.: "Alterar busca" na F3).
   */
  initialCriteria?: Partial<SearchCriteria>;
  /** Mostra a lista de buscas recentes abaixo do formulário (padrão `true`). */
  showRecentSearches?: boolean;
  /** `id` do título da página (vira o nome acessível do `<form>`). */
  labelledBy?: string;
  /** Destino já definido pela página (ex.: detalhe do hotel): vira texto, sem combobox. */
  fixedDestination?: string;
  /** Para onde enviar no lugar de `/search?...`; a navegação não rola a página. */
  getSubmitHref?: (criteria: SearchCriteria) => string;
  /** Rótulo do botão de envio (padrão "Buscar hotéis"). */
  submitLabel?: string;
  /** Rótulo do botão durante o envio (padrão "Buscando…"). */
  submitLoadingText?: string;
};

const FixedDestination = ({ name }: { name: string }) => (
  <dl className="flex flex-col gap-1">
    <dt className="text-sm font-medium text-fg">Destino</dt>
    <dd className="text-base text-fg">{name}</dd>
  </dl>
);

/** Formulário de busca: destino (autocomplete), datas, hóspedes e envio para `/search`. */
export const SearchForm = ({
  initialCriteria,
  showRecentSearches = true,
  labelledBy,
  fixedDestination,
  getSubmitHref,
  submitLabel = "Buscar hotéis",
  submitLoadingText = "Buscando…",
}: SearchFormProps) => {
  const search = useSearchForm(
    fixedDestination ? { ...initialCriteria, destination: fixedDestination } : initialCriteria,
    { getSubmitHref },
  );
  const { form, notices } = search;

  const clearRecent = () => {
    search.recent.clear();
    search.submitRef.current?.focus();
    toast.success("Buscas recentes apagadas.");
  };

  return (
    <div ref={search.containerRef} className="flex flex-col gap-8 lg:gap-12">
      <FormProvider {...form}>
        <form
          ref={search.formRef}
          noValidate
          onSubmit={search.onSubmit}
          aria-labelledby={labelledBy}
          aria-label={labelledBy ? undefined : "Buscar hotéis"}
          className="flex flex-col gap-4 rounded-card border border-border bg-surface p-4 shadow-card md:p-5 lg:gap-5 lg:p-6"
        >
          {search.summary.length > 0 ? (
            <ErrorSummary
              key={search.attempts}
              items={search.summary.map(({ field, label, message }) => ({
                id: field,
                label,
                message,
              }))}
              onSelect={(field) => form.setFocus(field)}
            />
          ) : null}
          {fixedDestination ? (
            <FixedDestination name={fixedDestination} />
          ) : (
            <Controller
              control={form.control}
              name="destination"
              render={({ field, fieldState }) => (
                <DestinationCombobox
                  value={field.value}
                  error={fieldState.error?.message}
                  inputRef={field.ref}
                  onBlur={() => search.deferBlur(field.onBlur)}
                  onChange={(name) =>
                    form.setValue("destination", name, {
                      shouldDirty: true,
                      shouldValidate: name !== "",
                    })
                  }
                />
              )}
            />
          )}
          <div className="flex flex-col gap-4 lg:grid lg:grid-cols-2 lg:gap-6">
            <DateRangeFields
              notice={notices.notice}
              onNotice={notices.showNotice}
              deferBlur={search.deferBlur}
            />
            <GuestsPicker />
          </div>
          <Button
            ref={search.submitRef}
            type="submit"
            size="lg"
            fullWidth
            className="lg:ml-auto lg:w-auto lg:min-w-56"
            leftIcon={<SearchIcon className="size-5" />}
            loading={search.isPending}
            loadingText={submitLoadingText}
          >
            {submitLabel}
          </Button>
          <p className="sr-only" aria-live="polite">
            {notices.announcement}
          </p>
        </form>
      </FormProvider>
      {showRecentSearches ? (
        <RecentSearches
          items={search.recent.items}
          onRestore={search.restore}
          onClear={clearRecent}
        />
      ) : null}
    </div>
  );
};
