import type { Room } from "@/shared/api/schemas";
import { commonMessages } from "@/shared/i18n/common/messages";
import type { Locale } from "@/shared/i18n/config";
import { lowestNightlyPrice } from "@/shared/lib/pricing";
import { Badge, PriceTag } from "@/shared/ui";
import type { Settled } from "../api/settled";
import { hotelDetailsMessages } from "../i18n/messages";
import { RequestOnly } from "./RequestOnly";

type FromPriceProps = { locale: Locale; rooms: Settled<readonly Room[]> };

/**
 * "a partir de R$ 800 por noite", calculado pelos quartos (não pelo `pricePerNight` do hotel, que
 * diverge). Server Component sobre o snapshot do catálogo: entra na casca estática. Se os quartos
 * falharam, "Preços indisponíveis" só por request (`RequestOnly`), nunca na casca; a altura é a mesma.
 */
export const FromPrice = ({ locale, rooms }: FromPriceProps) => {
  const t = hotelDetailsMessages.get(locale).fromPrice;
  if (rooms.kind === "error") {
    return (
      <div className="min-h-8">
        <RequestOnly>
          <p className="text-sm text-fg-muted">{t.unavailable}</p>
        </RequestOnly>
      </div>
    );
  }
  const from = lowestNightlyPrice(rooms.value);
  return (
    <div className="min-h-8">
      {from === null ? (
        <p className="text-sm text-fg-muted">{t.noRooms}</p>
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
