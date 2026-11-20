"use client";

import { useLocale } from "@/shared/i18n/client";
import { ErrorState } from "@/shared/ui";
import { useHotelDetailsMessages } from "../hooks/useHotelDetailsMessages";
import { useRefreshRetry } from "../hooks/useRefreshRetry";

type SectionRefreshErrorProps = {
  /** `id` do h2 da seção: recebe o foco quando o retry traz o conteúdo de volta. */
  headingId: string;
  title: string;
};

/**
 * Erro de uma seção cujo dado falhou no servidor (nunca o texto da API) com "Tentar de novo" que
 * refaz a página (`router.refresh()`). O botão fica em "Tentando…" até a resposta chegar.
 */
export const SectionRefreshError = ({ headingId, title }: SectionRefreshErrorProps) => {
  const locale = useLocale();
  const t = useHotelDetailsMessages().errors;
  const { retry, retrying, anchorRef } = useRefreshRetry(headingId);
  return (
    <div ref={anchorRef}>
      <ErrorState
        locale={locale}
        title={title}
        description={t.sectionRetry}
        headingLevel={3}
        onRetry={retry}
        retrying={retrying}
      />
    </div>
  );
};
