"use client";

import Link from "next/link";
import { useLocale } from "@/shared/i18n/client";
import { localizePath } from "@/shared/i18n/paths";
import { Button, buttonClassName, EmptyState } from "@/shared/ui";
import { useHotelSearchMessages } from "../hooks/useHotelSearchMessages";

type ResultsEmptyProps =
  | { kind: "destination"; destination: string }
  | { kind: "filters"; onClear: () => void };

/** Vazio útil: diz o que fazer agora (nova busca ou limpar filtros). */
export const ResultsEmpty = (props: ResultsEmptyProps) => {
  const t = useHotelSearchMessages().list;
  const locale = useLocale();
  return props.kind === "destination" ? (
    <EmptyState
      title={t.emptyDestTitle({ destination: props.destination })}
      description={t.emptyDestDescription}
      action={
        <Link href={localizePath(locale, "/")} className={buttonClassName({ variant: "primary" })}>
          {t.newSearch}
        </Link>
      }
    />
  ) : (
    <EmptyState
      title={t.emptyFilters}
      description={t.emptyFiltersDescription}
      action={<Button onClick={props.onClear}>{t.clearFilters}</Button>}
    />
  );
};
