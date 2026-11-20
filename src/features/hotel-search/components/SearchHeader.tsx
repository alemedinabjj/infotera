"use client";

import { type ReactNode, useRef, useState } from "react";
import { useLocale } from "@/shared/i18n/client";
import { cn } from "@/shared/lib/cn";
import { Alert, Button, ChevronDownIcon, copyCurrentUrl, LinkIcon } from "@/shared/ui";
import { useFocusAfterEdit } from "../hooks/useFocusAfterEdit";
import { useHotelSearchMessages } from "../hooks/useHotelSearchMessages";

/** `id` do `h2` do painel: o formulário o usa como `labelledBy`. */
export const SEARCH_EDIT_HEADING_ID = "search-edit-heading";
const PANEL_ID = "search-edit-panel";

type SearchHeaderProps = {
  destination: string;
  /** `12–15 dez · 3 noites · 2 adultos · 1 quarto` ou `Datas não definidas`. */
  summary: string;
  /** `browse`: destino sem datas válidas (painel aberto e aviso pedindo as datas). */
  mode: "stay" | "browse";
  /**
   * O check-in já passou. Calculado no servidor (`app/` tem a data de hoje): o aviso já vem no
   * HTML e não desloca a página depois da hidratação.
   */
  pastDates: boolean;
  /** O `SearchForm` da F2, montado por `app/` (feature não importa feature). */
  editForm: ReactNode;
};

const BrowseNotice = () => {
  const t = useHotelSearchMessages().page;
  return (
    <Alert tone="info" title={t.browseTitle}>
      {t.browseBody}
    </Alert>
  );
};

const PastDatesNotice = () => {
  const t = useHotelSearchMessages().page;
  return (
    <Alert tone="warning" title={t.pastTitle}>
      {t.pastBody}
    </Alert>
  );
};

/**
 * Topo da página: h1 com o destino, resumo da busca, "Alterar busca" (disclosure com o formulário
 * logo abaixo do botão) e "Copiar link". Montar com `key` = critérios: nova busca remonta e fecha.
 */
export const SearchHeader = ({
  destination,
  summary,
  mode,
  pastDates,
  editForm,
}: SearchHeaderProps) => {
  const t = useHotelSearchMessages().page;
  const locale = useLocale();
  const [open, setOpen] = useState(mode === "browse");
  const headingRef = useRef<HTMLHeadingElement>(null);
  useFocusAfterEdit(headingRef);

  return (
    <header className="flex flex-col gap-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 ref={headingRef} tabIndex={-1} className="text-2xl font-bold text-fg lg:text-3xl">
            {t.title({ destination })}
          </h1>
          <p className="mt-1 text-sm text-fg-muted tabular-nums">{summary}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button
            variant="secondary"
            size="sm"
            aria-expanded={open}
            aria-controls={PANEL_ID}
            rightIcon={
              <ChevronDownIcon
                className={cn("size-4 transition-transform", open && "rotate-180")}
              />
            }
            onClick={() => setOpen((current) => !current)}
          >
            {t.editSearch}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<LinkIcon className="size-4" />}
            onClick={() => void copyCurrentUrl(locale)}
          >
            {t.copyLink}
          </Button>
        </div>
      </div>
      {open ? (
        <div id={PANEL_ID} className="flex flex-col gap-4">
          <h2 id={SEARCH_EDIT_HEADING_ID} className="sr-only">
            {t.editSearch}
          </h2>
          {mode === "browse" ? <BrowseNotice /> : null}
          {editForm}
        </div>
      ) : null}
      {pastDates ? <PastDatesNotice /> : null}
    </header>
  );
};
