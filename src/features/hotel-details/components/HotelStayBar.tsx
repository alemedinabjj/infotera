"use client";

import type { ReactNode } from "react";
import { cn } from "@/shared/lib/cn";
import { type SearchCriteria, searchCriteriaToQueryString } from "@/shared/lib/search-params";
import { Alert, Button, ChevronDownIcon, cardClassName } from "@/shared/ui";
import { useFocusAfterDates } from "../hooks/useFocusAfterDates";
import { STAY_EDIT_TITLE_ID } from "../model/sections";
import { useStayEdit } from "./StayEditContext";

const PANEL_ID = "stay-edit-panel";

type HotelStayBarProps = {
  /** `null`: acesso direto, sem datas. */
  criteria: SearchCriteria | null;
  /** `12–15 dez · 3 noites · 2 adultos · 1 quarto` (só com critérios). */
  summary: string | null;
  /** O check-in já passou (calculado no servidor, igual à F3: o aviso já vem no HTML). */
  pastDates: boolean;
  /** O `SearchForm` da F2, montado por `app/` (feature não importa feature). */
  datesForm: ReactNode;
};

const Panel = ({ children }: { children: ReactNode }) => (
  <div id={PANEL_ID}>
    <h3 id={STAY_EDIT_TITLE_ID} className="sr-only">
      Alterar datas e hóspedes
    </h3>
    {children}
  </div>
);

const MissingDates = ({ datesForm }: { datesForm: ReactNode }) => (
  <div className="flex flex-col gap-4">
    <Alert tone="info" title="Escolha as datas para reservar">
      Com as datas e os hóspedes, mostramos o preço total e a disponibilidade de cada quarto.
    </Alert>
    <Panel>{datesForm}</Panel>
  </div>
);

/**
 * Barra da estadia no topo de "Quartos". Com critérios: resumo + "Alterar datas e hóspedes"
 * (disclosure; o painel abre **abaixo** do botão). Sem critérios: aviso e o formulário sempre
 * aberto. Enviar o formulário fecha o painel (os critérios mudam) e leva o foco ao h2 "Quartos".
 */
export const HotelStayBar = ({ criteria, summary, pastDates, datesForm }: HotelStayBarProps) => {
  const key = criteria ? searchCriteriaToQueryString(criteria) : "none";
  const { open, toggle } = useStayEdit();
  useFocusAfterDates(key);

  if (criteria === null) return <MissingDates datesForm={datesForm} />;

  return (
    <div className="flex flex-col gap-4">
      <div
        className={cardClassName({
          className: "gap-3 p-4 sm:flex-row sm:items-center sm:justify-between",
        })}
      >
        <div>
          <p className="text-sm font-medium text-fg-muted">Sua estadia</p>
          <p className="text-base font-semibold text-fg tabular-nums">{summary}</p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          aria-expanded={open}
          aria-controls={PANEL_ID}
          rightIcon={
            <ChevronDownIcon className={cn("size-4 transition-transform", open && "rotate-180")} />
          }
          onClick={toggle}
        >
          Alterar datas e hóspedes
        </Button>
      </div>
      {open ? <Panel>{datesForm}</Panel> : null}
      {pastDates ? (
        <Alert tone="warning" title="As datas desta busca já passaram">
          Preços e disponibilidade podem ter mudado. Use “Alterar datas e hóspedes” para escolher
          novas datas.
        </Alert>
      ) : null}
    </div>
  );
};
