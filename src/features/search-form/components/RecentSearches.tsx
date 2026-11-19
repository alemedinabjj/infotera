"use client";

import { useId } from "react";
import { useToday } from "@/shared/hooks/useToday";
import { type SearchCriteria, searchCriteriaToQueryString } from "@/shared/lib/search-params";
import { Badge, Button, HistoryIcon, VisuallyHidden } from "@/shared/ui";
import {
  describeRecentDetails,
  describeRecentSearch,
  hasExpiredDates,
} from "../model/recent-searches";

type RecentSearchesProps = {
  items: SearchCriteria[];
  /** Preenche o formulário com a busca (não envia). */
  onRestore: (criteria: SearchCriteria) => void;
  onClear: () => void;
};

/** Últimas buscas salvas. Sem itens a seção nem é renderizada. */
export const RecentSearches = ({ items, onRestore, onClear }: RecentSearchesProps) => {
  const headingId = useId();
  const hintId = useId();
  const today = useToday();
  if (items.length === 0) return null;

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3">
      <h2 id={headingId} className="flex items-center gap-2 text-lg font-semibold text-fg">
        <HistoryIcon className="size-5 text-fg-muted" />
        Buscas recentes
      </h2>
      <VisuallyHidden id={hintId}>Preenche o formulário com esta busca.</VisuallyHidden>
      <ul className="grid gap-3 md:grid-cols-2">
        {items.map((item) => {
          const expired = today !== null && hasExpiredDates(item, today);
          const label = today === null ? item.destination : describeRecentSearch(item, today);
          return (
            <li key={searchCriteriaToQueryString(item)}>
              <button
                type="button"
                aria-label={expired ? `${label}, datas passadas` : label}
                aria-describedby={hintId}
                onClick={() => onRestore(item)}
                className="flex min-h-14 w-full gap-3 rounded-card border border-border bg-surface px-4 py-3 text-left hover:border-border-strong hover:bg-surface-sunken"
              >
                <HistoryIcon className="mt-0.5 size-5 shrink-0 text-fg-subtle" />
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="flex flex-wrap items-center gap-2 font-medium text-fg">
                    {item.destination}
                    {expired ? <Badge>Datas passadas</Badge> : null}
                  </span>
                  <span className="text-sm text-fg-muted tabular-nums">
                    {today === null ? "" : describeRecentDetails(item, today)}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <div>
        <Button variant="ghost" size="sm" onClick={onClear}>
          Limpar buscas recentes
        </Button>
      </div>
    </section>
  );
};
