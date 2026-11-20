"use client";

import type { ReactNode } from "react";
import { useLocale } from "../../i18n/client";
import { useCommonMessages } from "../../i18n/common/useCommonMessages";
import { cn } from "../../lib/cn";
import {
  formatCents,
  type PriceLine,
  priceLineAmount,
  priceLineLabel,
} from "../../lib/price-breakdown";

type PriceBreakdownProps = {
  /** Linhas na ordem de `priceBreakdownLines`. Vazio: só o total (detalhamento indisponível). */
  lines: PriceLine[];
  totalCents: number;
  /** Entra logo depois da linha de estadia (ex.: skeleton do desconto em validação). */
  afterStay?: ReactNode;
  /** `false` omite a nota de impostos (sem detalhamento confiável). Padrão: `true`. */
  showTaxNote?: boolean;
  /** Classes extras da linha do total (ex.: sticky no aside do checkout). */
  totalClassName?: string;
};

const Row = ({ line }: { line: PriceLine }) => {
  const locale = useLocale();
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="min-w-0 text-sm text-fg">{priceLineLabel(line, locale)}</dt>
      <dd
        className={`shrink-0 text-right text-sm font-medium whitespace-nowrap tabular-nums ${line.kind === "discount" ? "text-success" : "text-fg"}`}
      >
        {priceLineAmount(line, locale)}
      </dd>
    </div>
  );
};

/**
 * Detalhamento do preço em `<dl>`: estadia → desconto → taxa de serviço → ISS → total. Só
 * apresentação: sem skeleton e sem região viva (quem anuncia é o controle que mudou o preço).
 */
export const PriceBreakdown = ({
  lines,
  totalCents,
  afterStay = null,
  showTaxNote = true,
  totalClassName,
}: PriceBreakdownProps) => {
  const locale = useLocale();
  const t = useCommonMessages().price;
  const [stay, ...rest] = lines;
  return (
    <div className="flex flex-col gap-2">
      <dl className="flex flex-col gap-2">
        {stay ? <Row line={stay} /> : null}
        {afterStay}
        {rest.map((line) => (
          <Row key={line.kind} line={line} />
        ))}
      </dl>
      {/* Total e nota juntos: se o total é `sticky`, a nota nunca fica escondida atrás dele. */}
      <div
        className={cn(
          "flex flex-col gap-2",
          lines.length > 0 && "border-t border-border pt-3",
          totalClassName,
        )}
      >
        <dl>
          <div className="flex items-start justify-between gap-3">
            <dt className="text-base font-semibold text-fg">{t.total}</dt>
            <dd className="shrink-0 text-2xl font-bold whitespace-nowrap text-fg tabular-nums">
              {formatCents(totalCents, locale)}
            </dd>
          </div>
        </dl>
        {showTaxNote ? <p className="text-sm text-fg-muted">{t.taxesIncluded}</p> : null}
      </div>
    </div>
  );
};
