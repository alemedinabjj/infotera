import { connection } from "next/server";
import { type ReactNode, Suspense } from "react";
import type { Locale } from "@/shared/i18n/config";
import { isBeforeToday, todayISO } from "@/shared/lib/dates";
import type { SearchCriteria } from "@/shared/lib/search-params";
import { describeStay } from "@/shared/lib/stay-summary";
import { HotelStayBarSkeleton } from "./HotelStayBarSkeleton";
import { StayBarView } from "./StayBarView";

type HotelStayBarProps = {
  locale: Locale;
  /** Promessa dos critérios da URL (pendente na casca). */
  criteria: Promise<SearchCriteria | null>;
  /** O `SearchForm` da F2 montado por `app/` para os critérios resolvidos (feature não importa feature). */
  renderDatesForm: (criteria: SearchCriteria | null) => ReactNode;
};

const ResolvedStayBar = async ({ locale, criteria, renderDatesForm }: HotelStayBarProps) => {
  const resolved = await criteria;
  // "Hoje" muda entre renders: só depois de um acesso dinâmico (nunca na casca estática).
  await connection();
  const today = todayISO();
  return (
    <StayBarView
      criteria={resolved}
      summary={resolved ? describeStay(resolved, today, locale) : null}
      pastDates={resolved ? isBeforeToday(resolved.checkIn, today) : false}
      datesForm={renderDatesForm(resolved)}
    />
  );
};

/**
 * Buraco 1 do PPR: resumo da estadia, aviso "Escolha as datas" e o formulário. Espera os critérios
 * dentro do Suspense; o fallback é um skeleton da mesma altura (caso com datas).
 */
export const HotelStayBar = (props: HotelStayBarProps) => (
  <Suspense fallback={<HotelStayBarSkeleton />}>
    <ResolvedStayBar {...props} />
  </Suspense>
);
