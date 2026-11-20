import type { Room } from "@/shared/api/schemas";
import { commonMessages } from "@/shared/i18n/common/messages";
import type { Locale } from "@/shared/i18n/config";
import { lowestNightlyPrice } from "@/shared/lib/pricing";
import { Badge, PriceTag } from "@/shared/ui";
import { hotelDetailsMessages } from "../i18n/messages";

/**
 * "a partir de R$ 800 por noite", calculado pelos quartos (não pelo `pricePerNight` do hotel, que
 * diverge). Server Component sobre o snapshot do catálogo: entra na casca estática.
 */
export const FromPrice = ({ locale, rooms }: { locale: Locale; rooms: readonly Room[] }) => {
  const from = lowestNightlyPrice(rooms);
  return (
    <div className="min-h-8">
      {from === null ? (
        <p className="text-sm text-fg-muted">
          {hotelDetailsMessages.get(locale).fromPrice.noRooms}
        </p>
      ) : (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <PriceTag locale={locale} variant="nightly-inline" nightly={from.price} />
          {from.soldOut ? (
            <Badge tone="danger">{commonMessages.get(locale).availability.soldOut}</Badge>
          ) : null}
        </div>
      )}
    </div>
  );
};
