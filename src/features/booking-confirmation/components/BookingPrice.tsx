import type { Locale } from "@/shared/i18n/config";
import { PriceBreakdown } from "@/shared/ui";
import type { PriceView } from "../model/confirmation-view";

/**
 * Detalhamento gravado com a reserva (igual ao do checkout) ou, sem um detalhamento confiável,
 * só o total de `totalPrice`. O preço nunca é recalculado: é o que foi cobrado.
 */
export const BookingPrice = ({ price, locale }: { price: PriceView; locale: Locale }) => {
  switch (price.kind) {
    case "breakdown":
      return <PriceBreakdown locale={locale} lines={price.lines} totalCents={price.totalCents} />;
    case "total-only":
      return (
        <PriceBreakdown
          locale={locale}
          lines={[]}
          totalCents={price.totalCents}
          showTaxNote={false}
        />
      );
    default: {
      const unreachable: never = price;
      return unreachable;
    }
  }
};
