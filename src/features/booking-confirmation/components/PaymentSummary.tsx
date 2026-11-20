import { CreditCardIcon } from "@/shared/ui";
import type { PriceView } from "../model/confirmation-view";
import { BookingPrice } from "./BookingPrice";
import { ReceiptSection } from "./ReceiptSection";

type PaymentSummaryProps = {
  cardLast4: string | null;
  price: PriceView;
};

/** Pagamento simulado: cartão (só os 4 últimos dígitos, quando gravados) e o preço. */
export const PaymentSummary = ({ cardLast4, price }: PaymentSummaryProps) => (
  <ReceiptSection titleId="pagamento-titulo" title="Pagamento">
    <div className="flex flex-col gap-1">
      {cardLast4 ? (
        <p className="flex items-center gap-2 text-base font-medium text-fg">
          <CreditCardIcon className="size-5 shrink-0" />
          Cartão final {cardLast4}
        </p>
      ) : null}
      <p className="text-sm text-fg-muted">Pagamento simulado: nenhum valor foi cobrado.</p>
    </div>
    <div className="border-t border-border pt-4">
      <BookingPrice price={price} />
    </div>
  </ReceiptSection>
);
