import type { ReactNode } from "react";
import { Skeleton } from "@/shared/ui";
import type { CheckoutPrice } from "../hooks/checkout-price";
import { describeNightsAndRooms, formatCents } from "../model/price-labels";

type ActionBarProps = {
  price: CheckoutPrice;
  rooms: number;
  /** O botão primário do passo (o próprio `submit` do formulário, nunca uma cópia). */
  children: ReactNode;
};

const TotalValue = ({ price }: { price: CheckoutPrice }) => {
  switch (price.status) {
    case "loading":
      return <Skeleton className="h-7 w-28" />;
    case "error":
      return <span className="text-sm text-fg-muted">Total indisponível</span>;
    case "ready":
      return <span>{formatCents(price.result.quote.totalCents)}</span>;
    default: {
      const unreachable: never = price;
      return unreachable;
    }
  }
};

/**
 * Barra de ação fixa abaixo de `lg` (DS §4.5): total + botão do passo. No `lg+` vira um card
 * estático no fim do formulário, com o mesmo "Total R$ X" ao lado do botão (o total não some na
 * hora de confirmar). Altura estável entre os estados do total.
 */
export const ActionBar = ({ price, rooms, children }: ActionBarProps) => (
  <div
    data-action-bar
    className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-raised lg:static lg:z-auto lg:rounded-card lg:border lg:bg-canvas lg:p-4 lg:shadow-none"
  >
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <div className="flex items-baseline justify-between gap-3 sm:flex-col-reverse sm:items-start sm:gap-0">
        <p className="text-sm text-fg-muted">
          <span className="sm:hidden">Total · </span>
          {describeNightsAndRooms(price.nights, rooms)}
        </p>
        <p className="flex min-h-7 items-center text-xl font-bold whitespace-nowrap text-fg tabular-nums">
          <TotalValue price={price} />
        </p>
      </div>
      <div className="sm:w-auto sm:min-w-56">{children}</div>
    </div>
  </div>
);
