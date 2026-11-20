"use client";

import type { Locale } from "@/shared/i18n/config";
import { revealBelowHeader } from "@/shared/lib/scroll";
import type { SearchCriteria } from "@/shared/lib/search-params";
import { compareHref, comparisonActions } from "@/shared/saved";

export const COMPARE_TITLE_ID = "compare-title";

/**
 * Remove uma coluna: atualiza a URL com `replaceState` (sem novo item no histórico), tira o hotel
 * da bandeja se estiver nela (mesma intenção) e leva o foco ao título, porque a coluna e o botão
 * que tinham o foco somem.
 */
export const removeColumn = (
  locale: Locale,
  ids: readonly number[],
  id: number,
  criteria: SearchCriteria | null,
): void => {
  window.history.replaceState(
    null,
    "",
    compareHref(
      locale,
      ids.filter((item) => item !== id),
      criteria,
    ),
  );
  comparisonActions.remove(id);
  const title = document.getElementById(COMPARE_TITLE_ID);
  title?.focus({ preventScroll: true });
  revealBelowHeader(title);
};

/**
 * Tira ids que a API não devolveu: URL por `replaceState` e bandeja (o aviso "saiu da comparação"
 * precisa ser verdade). Não mexe no foco: ninguém clicou em nada.
 */
export const dropMissingIds = (
  locale: Locale,
  ids: readonly number[],
  missing: readonly number[],
  criteria: SearchCriteria | null,
): void => {
  const gone = new Set(missing);
  window.history.replaceState(
    null,
    "",
    compareHref(
      locale,
      ids.filter((id) => !gone.has(id)),
      criteria,
    ),
  );
  for (const id of missing) comparisonActions.remove(id);
};
