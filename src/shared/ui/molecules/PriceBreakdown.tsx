import type { ReactNode } from "react";
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
};

const Row = ({ line }: { line: PriceLine }) => (
  <div className="flex items-start justify-between gap-3">
    <dt className="min-w-0 text-sm text-fg">{priceLineLabel(line)}</dt>
    <dd
      className={`shrink-0 text-right text-sm font-medium whitespace-nowrap tabular-nums ${line.kind === "discount" ? "text-success" : "text-fg"}`}
    >
      {priceLineAmount(line)}
    </dd>
  </div>
);

/**
 * Detalhamento do preço em `<dl>`: estadia → desconto → taxa de serviço → ISS → total. Só
 * apresentação: sem skeleton e sem região viva (quem anuncia é o controle que mudou o preço).
 */
export const PriceBreakdown = ({
  lines,
  totalCents,
  afterStay = null,
  showTaxNote = true,
}: PriceBreakdownProps) => {
  const [stay, ...rest] = lines;
  return (
    <div className="flex flex-col gap-2">
      <dl className="flex flex-col gap-2">
        {stay ? <Row line={stay} /> : null}
        {afterStay}
        {rest.map((line) => (
          <Row key={line.kind} line={line} />
        ))}
        <div
          className={`flex items-start justify-between gap-3 ${lines.length > 0 ? "border-t border-border pt-3" : ""}`}
        >
          <dt className="text-base font-semibold text-fg">Total</dt>
          <dd className="shrink-0 text-2xl font-bold whitespace-nowrap text-fg tabular-nums">
            {formatCents(totalCents)}
          </dd>
        </div>
      </dl>
      {showTaxNote ? <p className="text-sm text-fg-muted">Impostos e taxas incluídos.</p> : null}
    </div>
  );
};
