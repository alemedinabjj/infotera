import Link from "next/link";
import type { ReactNode } from "react";
import { hotelHref } from "@/shared/lib/links";
import type { SearchCriteria } from "@/shared/lib/search-params";
import { ArrowLeftIcon } from "@/shared/ui";

type CheckoutLayoutProps = {
  hotelId: number;
  criteria: SearchCriteria;
  steps: ReactNode;
  summary: ReactNode;
  form: ReactNode;
};

/**
 * Cabeçalho da página + grid. Ordem do DOM (= ordem de foco em todas as larguras): passos →
 * resumo ("o que estou comprando") → formulário. No `lg+` o resumo vai para a direita por
 * `grid-column`/`grid-row` (nunca `order-*`). Abaixo de `lg` reserva espaço para a barra fixa.
 */
export const CheckoutLayout = ({
  hotelId,
  criteria,
  steps,
  summary,
  form,
}: CheckoutLayoutProps) => (
  <div className="flex flex-col gap-4 pb-36 sm:pb-28 lg:gap-6 lg:pb-0">
    <div className="flex flex-col gap-4 lg:gap-6">
      <Link
        href={hotelHref(hotelId, criteria)}
        className="inline-flex min-h-11 items-center gap-1.5 self-start text-sm font-medium text-primary hover:underline"
      >
        <ArrowLeftIcon className="size-4" />
        Voltar ao hotel
      </Link>
      <h1 className="text-2xl font-bold text-fg lg:text-3xl">Finalizar reserva</h1>
    </div>
    <div className="grid gap-6 lg:grid-cols-[1fr_22rem] lg:items-start lg:gap-8">
      <div className="lg:col-start-1 lg:row-start-1">{steps}</div>
      {summary}
      {form}
    </div>
  </div>
);
