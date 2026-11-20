import type { Locale } from "@/shared/i18n/config";
import { CreditCardIcon } from "@/shared/ui";
import { confirmationMessages } from "../i18n/messages";
import type { PriceView } from "../model/confirmation-view";
import { BookingPrice } from "./BookingPrice";
import { ReceiptSection } from "./ReceiptSection";

type PaymentSummaryProps = {
  cardLast4: string | null;
  price: PriceView;
  locale: Locale;
};

/** Pagamento simulado: cartão (só os 4 últimos dígitos, quando gravados) e o preço. */
export const PaymentSummary = ({ cardLast4, price, locale }: PaymentSummaryProps) => {
  const t = confirmationMessages.get(locale).payment;
  return (
    <ReceiptSection titleId="pagamento-titulo" title={t.title}>
      <div className="flex flex-col gap-1">
        {cardLast4 ? (
          <p className="flex items-center gap-2 text-base font-medium text-fg">
            <CreditCardIcon className="size-5 shrink-0" />
            {t.card(cardLast4)}
          </p>
        ) : null}
        <p className="text-sm text-fg-muted">{t.simulated}</p>
      </div>
      <div className="border-t border-border pt-4">
        <BookingPrice price={price} locale={locale} />
      </div>
    </ReceiptSection>
  );
};
