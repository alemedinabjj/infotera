"use client";

import { Controller, FormProvider } from "react-hook-form";
import type { SearchCriteria } from "@/shared/lib/search-params";
import { Button, SearchIcon } from "@/shared/ui";
import { useSearchForm } from "../hooks/useSearchForm";
import { DateRangeFields } from "./DateRangeFields";
import { DestinationCombobox } from "./DestinationCombobox";
import { ErrorSummary } from "./ErrorSummary";
import { GuestsPicker } from "./GuestsPicker";

type SearchFormProps = {
  /** Preenche tudo e trata o destino como já escolhido (ex.: "Alterar busca" na F3). */
  initialCriteria?: SearchCriteria;
  /** `id` do título da página (vira o nome acessível do `<form>`). */
  labelledBy?: string;
};

/** Formulário de busca: destino (autocomplete), datas, hóspedes e envio para `/search`. */
export const SearchForm = ({ initialCriteria, labelledBy }: SearchFormProps) => {
  const search = useSearchForm(initialCriteria);
  const { form, notices } = search;

  return (
    <FormProvider {...form}>
      <form
        noValidate
        onSubmit={search.onSubmit}
        aria-labelledby={labelledBy}
        aria-label={labelledBy ? undefined : "Buscar hotéis"}
        className="flex flex-col gap-4 rounded-card border border-border bg-surface p-4 shadow-card md:p-5 lg:gap-5 lg:p-6"
      >
        {search.summary.length > 0 ? (
          <ErrorSummary
            key={search.attempts}
            items={search.summary}
            onSelect={(field) => form.setFocus(field)}
          />
        ) : null}
        <Controller
          control={form.control}
          name="destination"
          render={({ field, fieldState }) => (
            <DestinationCombobox
              value={field.value}
              error={fieldState.error?.message}
              inputRef={field.ref}
              onBlur={field.onBlur}
              onChange={(name) =>
                form.setValue("destination", name, {
                  shouldDirty: true,
                  shouldValidate: name !== "",
                })
              }
            />
          )}
        />
        <div className="flex flex-col gap-4 lg:grid lg:grid-cols-2 lg:gap-6">
          <DateRangeFields notice={notices.notice} onNotice={notices.showNotice} />
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
          loadingText="Buscando…"
        >
          Buscar hotéis
        </Button>
        <p className="sr-only" aria-live="polite">
          {notices.announcement}
        </p>
      </form>
    </FormProvider>
  );
};
