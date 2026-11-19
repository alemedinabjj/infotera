"use client";

import { useSlowLoading } from "@/shared/hooks/useSlowLoading";
import { ErrorState, Skeleton } from "@/shared/ui";
import type { CheckoutPrice } from "../hooks/checkout-price";
import type { PriceLine } from "../model/price";
import { formatCents, priceLineAmount, priceLineLabel } from "../model/price-labels";
import { PriceBreakdownSkeleton } from "./PriceBreakdownSkeleton";

type PriceBreakdownProps = {
  price: CheckoutPrice;
  /** Cupom em validação: só a linha de desconto vira skeleton. */
  couponValidating?: boolean;
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

const DiscountSkeleton = () => (
  <div aria-hidden="true" className="flex items-start justify-between gap-3">
    <Skeleton className="h-5 w-2/5" />
    <Skeleton className="h-5 w-20" />
  </div>
);

/**
 * Detalhamento do preço em `<dl>`: estadia → desconto → taxa de serviço → ISS → total. Skeleton
 * com `aria-busy` enquanto o quarto carrega, erro com retry. O total não é região viva (quem
 * anuncia é o controle que mudou o preço).
 */
export const PriceBreakdown = ({ price, couponValidating = false }: PriceBreakdownProps) => {
  const slow = useSlowLoading(price.status === "loading");
  if (price.status === "loading") return <PriceBreakdownSkeleton slow={slow} />;
  if (price.status === "error") {
    return (
      <ErrorState
        headingLevel={3}
        title="Não foi possível carregar o preço."
        description="Verifique sua conexão e tente de novo."
        onRetry={price.retry}
        retrying={price.retrying}
        className="py-4"
      />
    );
  }
  const { quote } = price.result;
  const [stay, ...rest] = quote.lines;
  return (
    <div className="flex flex-col gap-2">
      <dl className="flex flex-col gap-2">
        {stay ? <Row line={stay} /> : null}
        {couponValidating ? <DiscountSkeleton /> : null}
        {rest.map((line) => (
          <Row key={line.kind} line={line} />
        ))}
        <div className="flex items-start justify-between gap-3 border-t border-border bg-surface pt-3 lg:sticky lg:bottom-0 lg:-mx-4 lg:-mb-4 lg:px-4 lg:pb-4">
          <dt className="text-base font-semibold text-fg">Total</dt>
          <dd className="shrink-0 text-2xl font-bold whitespace-nowrap text-fg tabular-nums">
            {formatCents(quote.totalCents)}
          </dd>
        </div>
      </dl>
      <p className="text-sm text-fg-muted">Impostos e taxas incluídos.</p>
    </div>
  );
};
