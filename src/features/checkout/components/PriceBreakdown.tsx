"use client";

import { useSlowLoading } from "@/shared/hooks/useSlowLoading";
import { ErrorState, PriceBreakdown as SharedPriceBreakdown, Skeleton } from "@/shared/ui";
import type { CheckoutPrice } from "../hooks/checkout-price";
import { PriceBreakdownSkeleton } from "./PriceBreakdownSkeleton";

type PriceBreakdownProps = {
  price: CheckoutPrice;
  /** Cupom em validação: só a linha de desconto vira skeleton. */
  couponValidating?: boolean;
};

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
  return (
    <SharedPriceBreakdown
      lines={quote.lines}
      totalCents={quote.totalCents}
      afterStay={couponValidating ? <DiscountSkeleton /> : null}
      totalClassName="bg-surface lg:sticky lg:bottom-0 lg:-mx-4 lg:-mb-4 lg:px-4 lg:pb-4"
    />
  );
};
