"use client";

import { useRouter } from "next/navigation";
import { readLastSearch } from "../../lib/last-search";
import { toast } from "../../ui/toast/toast-store";
import { useSavedMessages } from "../hooks/useSavedMessages";
import { type CompareEntry, compareHref } from "../model/comparison";
import { announceCompare } from "../stores/announcer";
import { comparisonActions, useComparisonStore } from "../stores/comparison";

type CompareActions = {
  /** Marca/desmarca; no limite avisa por toast e pela região viva sem marcar. */
  toggle: (entry: CompareEntry) => void;
  /** Tira um hotel (chip da bandeja, coluna da tabela). */
  remove: (entry: CompareEntry) => void;
};

/** Ações de comparação com os avisos (região viva e toast) que acompanham cada resultado. */
export const useCompareActions = (): CompareActions => {
  const MESSAGES = useSavedMessages().compare;
  const router = useRouter();

  const toggle = (entry: CompareEntry) => {
    const result = comparisonActions.toggle(entry);
    const count = useComparisonStore.getState().items.length;
    switch (result) {
      case "added":
        announceCompare(MESSAGES.entered(entry.name, count));
        return;
      case "removed":
        announceCompare(MESSAGES.left(entry.name));
        return;
      case "full": {
        announceCompare(MESSAGES.limitToast);
        const ids = useComparisonStore.getState().items.map((item) => item.id);
        toast.info(MESSAGES.limitToast, {
          key: "compare:limit",
          action: {
            label: MESSAGES.viewAction,
            onClick: () => router.push(compareHref(ids, readLastSearch())),
            navigates: true,
          },
        });
        return;
      }
      default: {
        const unreachable: never = result;
        return unreachable;
      }
    }
  };

  const remove = (entry: CompareEntry) => {
    comparisonActions.remove(entry.id);
    announceCompare(MESSAGES.left(entry.name));
  };

  return { toggle, remove };
};
