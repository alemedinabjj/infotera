import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { todayISO } from "@/shared/lib/dates";
import { type SearchCriteria, searchCriteriaToQueryString } from "@/shared/lib/search-params";
import { summarizeErrors } from "../model/error-summary";
import { EXPIRED_DATES_NOTICE, formatRestored } from "../model/notices";
import { restoreRecentSearch } from "../model/recent-searches";
import { searchFormResolver } from "../model/search-form.resolver";
import {
  DEFAULT_SEARCH_FORM_VALUES,
  type SearchFormValues,
  toFormValues,
} from "../model/search-form.schema";
import { useFormNotices } from "./useFormNotices";
import { useRecentSearches } from "./useRecentSearches";

/**
 * Liga RHF + schema + navegação. Submit válido: grava a busca nas recentes e vai para
 * `/search?...` dentro de uma transition (o botão fica "Buscando…" até a rota trocar).
 */
export const useSearchForm = (initialCriteria?: SearchCriteria) => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [attempts, setAttempts] = useState(0);
  const submitRef = useRef<HTMLButtonElement>(null);
  const notices = useFormNotices();
  const recent = useRecentSearches();
  const form = useForm<SearchFormValues, unknown, SearchCriteria>({
    resolver: searchFormResolver,
    defaultValues: initialCriteria ? toFormValues(initialCriteria) : DEFAULT_SEARCH_FORM_VALUES,
    mode: "onTouched",
    reValidateMode: "onChange",
    shouldFocusError: true,
  });

  // Lido sempre (não só após o submit) para o RHF assinar as mudanças de `errors`.
  const { errors } = form.formState;

  const onSubmit = form.handleSubmit(
    (criteria) => {
      recent.add(criteria);
      startTransition(() => router.push(`/search?${searchCriteriaToQueryString(criteria)}`));
    },
    () => setAttempts((count) => count + 1),
  );

  /** Preenche o formulário com uma busca recente (não envia). */
  const restore = (criteria: SearchCriteria) => {
    const { values, datesExpired } = restoreRecentSearch(criteria, todayISO());
    setAttempts(0);
    form.reset(values);
    if (datesExpired) {
      notices.showNotice({ field: "checkIn", text: EXPIRED_DATES_NOTICE });
      // `reset` re-registra os campos no próximo render; o foco espera por ele.
      setTimeout(() => form.setFocus("checkIn"), 0);
    } else {
      notices.showNotice(null);
      notices.announce(formatRestored(criteria.destination));
      submitRef.current?.focus();
    }
  };

  return {
    form,
    onSubmit,
    isPending,
    submitRef,
    notices,
    recent,
    restore,
    summary: attempts > 0 ? summarizeErrors(errors) : [],
    attempts,
  };
};
