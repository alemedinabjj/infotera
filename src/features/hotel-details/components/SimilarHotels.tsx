import Link from "next/link";
import { isApiError } from "@/shared/api/http";
import type { Hotel } from "@/shared/api/schemas";
import { commonMessages } from "@/shared/i18n/common/messages";
import type { Locale } from "@/shared/i18n/config";
import { localizePath } from "@/shared/i18n/paths";
import { searchHref } from "@/shared/lib/links";
import type { SearchCriteria } from "@/shared/lib/search-params";
import { buttonClassName, CompactHotelCard } from "@/shared/ui";
import { getSimilarHotelsSnapshot } from "../api/catalog.cached";
import { hotelDetailsMessages } from "../i18n/messages";
import { StayAware } from "./StayAware";

type SimilarHotelsProps = {
  locale: Locale;
  hotelId: number;
  destination: string;
  criteria: Promise<SearchCriteria | null>;
};

const LINK = "w-fit font-medium text-primary hover:underline";

const logFailure = (hotelId: number, error: unknown): void => {
  console.error("[hotel-details] similar hotels failed", {
    hotelId,
    kind: isApiError(error) ? error.kind : "unknown",
    status: isApiError(error) ? error.status : null,
  });
};

/**
 * Hotéis do mesmo destino, do snapshot do catálogo (RSC assíncrono sob Suspense). Os links dos cartões
 * ganham os critérios por `StayAware`. É recomendação: se falhar, a
 * página não cai nem pede retry; mostra um texto e um link para a lista do destino.
 */
export const SimilarHotels = async ({
  locale,
  hotelId,
  destination,
  criteria,
}: SimilarHotelsProps) => {
  const t = hotelDetailsMessages.get(locale);
  const { routes } = commonMessages.get(locale);
  let hotels: Hotel[];
  try {
    hotels = await getSimilarHotelsSnapshot(destination, hotelId);
  } catch (error) {
    logFailure(hotelId, error);
    return (
      <div className="flex flex-col items-start gap-1 text-fg-muted">
        <p>{t.similar.failed}</p>
        <StayAware criteria={criteria}>
          {(resolved) => (
            <Link href={localizePath(locale, searchHref(destination, resolved))} className={LINK}>
              {t.similar.seeIn({ destination })}
            </Link>
          )}
        </StayAware>
      </div>
    );
  }

  if (hotels.length === 0) {
    return (
      <div className="flex flex-col items-start gap-1 text-fg-muted">
        <p>{t.similar.none({ destination })}</p>
        <Link
          href={localizePath(locale, "/")}
          className={buttonClassName({ variant: "secondary" })}
        >
          {routes.newSearch}
        </Link>
      </div>
    );
  }

  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
      {hotels.map((hotel) => (
        <li key={hotel.id} className="flex">
          <StayAware criteria={criteria}>
            {(resolved) => <CompactHotelCard locale={locale} hotel={hotel} criteria={resolved} />}
          </StayAware>
        </li>
      ))}
    </ul>
  );
};
