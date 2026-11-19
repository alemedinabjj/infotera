"use client";

import { type ReactNode, useRef, useState } from "react";
import { useToday } from "@/shared/hooks/useToday";
import { cn } from "@/shared/lib/cn";
import { type ISODate, isBeforeToday } from "@/shared/lib/dates";
import { Alert, Button, ChevronDownIcon, LinkIcon } from "@/shared/ui";
import { markEditSubmitted, useFocusAfterEdit } from "../hooks/useFocusAfterEdit";
import { copyCurrentUrl } from "./copyCurrentUrl";

/** `id` do `h2` do painel: o formulário o usa como `labelledBy`. */
export const SEARCH_EDIT_HEADING_ID = "search-edit-heading";
const PANEL_ID = "search-edit-panel";

type SearchHeaderProps = {
  destination: string;
  /** `12–15 dez · 3 noites · 2 adultos · 1 quarto` ou `Datas não definidas`. */
  summary: string;
  /** `browse`: destino sem datas válidas (painel aberto e aviso pedindo as datas). */
  mode: "stay" | "browse";
  /** Check-in da busca (modo `stay`), para avisar quando já passou. */
  checkIn: ISODate | null;
  /** O `SearchForm` da F2, montado por `app/` (feature não importa feature). */
  editForm: ReactNode;
};

const BrowseNotice = () => (
  <Alert tone="info" title="Escolha as datas da estadia">
    Com datas e hóspedes, mostramos o preço total e a disponibilidade de cada hotel.
  </Alert>
);

const PastDatesNotice = () => (
  <Alert tone="warning" title="As datas desta busca já passaram">
    Preços e disponibilidade podem ter mudado. Use "Alterar busca" para escolher novas datas.
  </Alert>
);

/**
 * Topo da página: h1 com o destino, resumo da busca, "Alterar busca" (disclosure com o formulário
 * logo abaixo do botão) e "Copiar link". Montar com `key` = critérios: nova busca remonta e fecha.
 */
export const SearchHeader = ({
  destination,
  summary,
  mode,
  checkIn,
  editForm,
}: SearchHeaderProps) => {
  const [open, setOpen] = useState(mode === "browse");
  const headingRef = useRef<HTMLHeadingElement>(null);
  const today = useToday();
  useFocusAfterEdit(headingRef);
  const pastDates = today !== null && checkIn !== null && isBeforeToday(checkIn, today);

  return (
    <header className="flex flex-col gap-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 ref={headingRef} tabIndex={-1} className="text-2xl font-bold text-fg lg:text-3xl">
            Hotéis em {destination}
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
            Alterar busca
          </Button>
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<LinkIcon className="size-4" />}
            onClick={copyCurrentUrl}
          >
            Copiar link
          </Button>
        </div>
      </div>
      {open ? (
        <div id={PANEL_ID} className="flex flex-col gap-4" onSubmitCapture={markEditSubmitted}>
          <h2 id={SEARCH_EDIT_HEADING_ID} className="sr-only">
            Alterar busca
          </h2>
          {mode === "browse" ? <BrowseNotice /> : null}
          {editForm}
        </div>
      ) : null}
      {pastDates ? <PastDatesNotice /> : null}
    </header>
  );
};
