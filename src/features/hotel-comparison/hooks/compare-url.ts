"use client";

import { revealBelowHeader } from "@/shared/lib/scroll";
import { compareHref, comparisonActions } from "@/shared/saved";

export const COMPARE_TITLE_ID = "compare-title";

/**
 * Remove uma coluna: atualiza a URL com `replaceState` (sem novo item no histórico), tira o hotel
 * da bandeja se estiver nela (mesma intenção) e leva o foco ao título, porque a coluna e o botão
 * que tinham o foco somem.
 */
export const removeColumn = (ids: readonly number[], id: number): void => {
  window.history.replaceState(null, "", compareHref(ids.filter((item) => item !== id)));
  comparisonActions.remove(id);
  const title = document.getElementById(COMPARE_TITLE_ID);
  title?.focus({ preventScroll: true });
  revealBelowHeader(title);
};
