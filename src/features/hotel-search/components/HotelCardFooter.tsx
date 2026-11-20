import { Badge } from "@/shared/ui";
import type { CardPricing } from "../model/card-pricing";
import { PriceTag } from "./PriceTag";

/** Selo de disponibilidade (esquerda) + preço e nota (direita), colados: é onde se decide. */
export const HotelCardFooter = ({ pricing }: { pricing: CardPricing }) => {
  const { badge, note } = pricing.availability;
  return (
    <div className="mt-auto flex flex-wrap items-end justify-between gap-x-3 gap-y-2 border-t border-border pt-3">
      {badge ? <Badge tone={badge.tone}>{badge.text}</Badge> : null}
      <div className="ml-auto flex flex-col items-end gap-1 text-right">
        {pricing.stay ? (
          <PriceTag variant="stay" nightly={pricing.nightly} {...pricing.stay} />
        ) : note ? (
          <>
            <p className="text-sm text-fg-muted">{note}</p>
            <PriceTag variant="nightly-line" nightly={pricing.nightly} />
          </>
        ) : (
          <PriceTag variant="nightly" nightly={pricing.nightly} />
        )}
      </div>
    </div>
  );
};
