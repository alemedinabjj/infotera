"use client";

import { AnimatePresence, m, useReducedMotion } from "motion/react";
import { usePathname } from "next/navigation";
import { useId } from "react";
import { useHydrated } from "../../hooks/useHydrated";
import { useLocale } from "../../i18n/client";
import { useLastSearch } from "../../lib/last-search";
import { motionPreset } from "../../lib/motion";
import { Button } from "../../ui/atoms/Button";
import { IconButton } from "../../ui/atoms/IconButton";
import { XIcon } from "../../ui/icons";
import { toast } from "../../ui/toast/toast-store";
import { useBottomBarInset } from "../hooks/useBottomBarInset";
import { useCompareActions } from "../hooks/useCompareActions";
import { useKeepFocusAboveBar } from "../hooks/useKeepFocusAboveBar";
import { useSavedMessages } from "../hooks/useSavedMessages";
import type { SavedMessages } from "../i18n/pt-BR";
import { type CompareEntry, compareHref, MAX_COMPARE } from "../model/comparison";
import { isTrayHiddenOn } from "../model/tray";
import { useCompareAnnouncer } from "../stores/announcer";
import { comparisonActions, useComparison } from "../stores/comparison";
import { CompareTrayAction } from "./CompareTrayAction";
import { CompareTrayChips } from "./CompareTrayChips";

/** Limpa a comparação com Desfazer; o foco vai ao `<main>` porque a bandeja desmonta. */
const clearComparison = (messages: SavedMessages["compare"]) => {
  const previous = comparisonActions.clear();
  toast.info(messages.cleared, {
    key: "compare:clear",
    action: {
      label: messages.undoAction,
      onClick: () => comparisonActions.restoreAll(previous),
      // A bandeja volta: o foco vai ao "Comparar" dela (ou ao conteúdo, com 1 hotel só).
      returnFocus: () =>
        document.querySelector<HTMLElement>("[data-bottom-bar] a[href]") ??
        document.getElementById("main-content"),
    },
  });
  document.getElementById("main-content")?.focus({ preventScroll: true });
};

const TrayBar = ({ items }: { items: readonly CompareEntry[] }) => {
  const saved = useSavedMessages();
  const MESSAGES = saved.tray;
  const lastSearch = useLastSearch();
  const locale = useLocale();
  const titleId = useId();
  const measure = useBottomBarInset();
  const { remove } = useCompareActions();
  const preset = motionPreset("tray", useReducedMotion() ?? false);
  useKeepFocusAboveBar(true);

  return (
    <m.section
      data-bottom-bar
      aria-labelledby={titleId}
      ref={measure}
      initial={preset.initial}
      animate={preset.animate}
      exit={preset.exit}
      transition={preset.transition}
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-raised print:hidden"
    >
      <div className="mx-auto flex max-w-6xl items-center gap-3">
        <IconButton
          aria-label={MESSAGES.clearLabel}
          className="sm:hidden"
          icon={<XIcon className="size-5" />}
          onClick={() => clearComparison(saved.compare)}
        />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h2 id={titleId} className="sr-only text-sm font-semibold text-fg roomy:not-sr-only">
            {MESSAGES.title}
          </h2>
          <p className="text-sm text-fg-muted">{MESSAGES.counter(items.length)}</p>
          {items.length >= MAX_COMPARE ? (
            <p className="hidden text-sm text-fg-subtle tall:block">{saved.compare.limitHint}</p>
          ) : null}
          <CompareTrayChips items={items} onRemove={remove} />
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="hidden sm:inline-flex"
          onClick={() => clearComparison(saved.compare)}
        >
          {MESSAGES.clear}
        </Button>
        <CompareTrayAction
          count={items.length}
          href={compareHref(
            locale,
            items.map((item) => item.id),
            lastSearch,
          )}
        />
      </div>
    </m.section>
  );
};

/**
 * Bandeja de comparação, fixa no rodapé de todas as rotas (menos checkout, confirmação e a própria
 * comparação). A região viva fica sempre montada, fora da bandeja. Montar uma vez no layout raiz.
 */
export const CompareTray = () => {
  const pathname = usePathname();
  const hydrated = useHydrated();
  const items = useComparison();
  const announcement = useCompareAnnouncer((state) => state.message);
  const visible = hydrated && !isTrayHiddenOn(pathname) && items.length > 0;

  return (
    <>
      {/* `div`, não `p.sr-only`: o anunciador do feed da F3b é achado por esse seletor. */}
      <div aria-live="polite" className="sr-only">
        {announcement}
      </div>
      <AnimatePresence>{visible ? <TrayBar key="tray" items={items} /> : null}</AnimatePresence>
    </>
  );
};
