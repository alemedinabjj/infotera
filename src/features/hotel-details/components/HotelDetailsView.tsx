import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { Suspense } from "react";
import { hotelRoomsQueryOptions } from "@/shared/api/queries";
import { getServerQueryClient } from "@/shared/api/server-query-client";
import type { Locale } from "@/shared/i18n/config";
import { isBeforeToday, todayISO } from "@/shared/lib/dates";
import { type SearchCriteria, searchCriteriaToQueryString } from "@/shared/lib/search-params";
import { describeStay } from "@/shared/lib/stay-summary";
import { loadHotel } from "../api/hotel.server";
import { reviewsQueryOptions } from "../api/reviews";
import { hotelDetailsMessages } from "../i18n/messages";
import { hotelBreadcrumb } from "../model/breadcrumb";
import { Breadcrumb } from "./Breadcrumb";
import { Gallery } from "./Gallery";
import { HotelHeader } from "./HotelHeader";
import { HotelOverview } from "./HotelOverview";
import { HotelPolicies } from "./HotelPolicies";
import { HotelStayBar } from "./HotelStayBar";
import { LocationMap } from "./LocationMap";
import { ReviewsSection } from "./ReviewsSection";
import { RoomsSection } from "./RoomsSection";
import { Section } from "./Section";
import { SectionNav } from "./SectionNav";
import { SimilarHotels } from "./SimilarHotels";
import { SimilarHotelsSkeleton } from "./SimilarHotelsSkeleton";
import { SoldOutAlert } from "./SoldOutAlert";
import { StayEditProvider } from "./StayEditContext";

type HotelDetailsViewProps = {
  /** Idioma da rota (`[locale]`): vem dos params da página. */
  locale: Locale;
  hotelId: number;
  /** `null`: acesso direto, sem datas. */
  criteria: SearchCriteria | null;
  /**
   * Monta o `SearchForm` da F2 (destino fixo) com o destino do hotel; vem de `app/` (feature não
   * importa feature). Função servidor→servidor: o destino só se conhece depois de carregar o hotel.
   */
  renderDatesForm: (destination: string) => ReactNode;
};

/**
 * `/hotel/[hotelId]`. Server Component: dispara **antes de qualquer await** os quartos e a 1ª
 * página de avaliações (sem waterfall), espera só o hotel e renderiza o que é estático no
 * servidor. As promessas pendentes seguem no `HydrationBoundary`: as ilhas cliente leem as mesmas
 * chaves com `useSuspenseQuery` (streaming por seção). Hotel inexistente → `notFound()`.
 */
export const HotelDetailsView = async ({
  locale,
  hotelId,
  criteria,
  renderDatesForm,
}: HotelDetailsViewProps) => {
  const queryClient = getServerQueryClient();
  void queryClient.prefetchQuery(hotelRoomsQueryOptions(hotelId));
  void queryClient.prefetchQuery(reviewsQueryOptions(hotelId, 1));

  const loaded = await loadHotel(hotelId, queryClient);
  if (loaded.kind === "not-found") notFound();
  const { hotel } = loaded;

  const t = hotelDetailsMessages.get(locale);
  const today = todayISO();
  const summary = criteria ? describeStay(criteria, today, locale) : null;
  const breadcrumb = hotelBreadcrumb(hotel, criteria, locale);
  const pastDates = criteria ? isBeforeToday(criteria.checkIn, today) : false;

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <div className="flex flex-col gap-8 lg:gap-12">
        <div className="flex flex-col gap-4">
          <Breadcrumb {...breadcrumb} />
          <HotelHeader locale={locale} hotel={hotel} stayLabel={summary}>
            <Gallery name={hotel.name} images={hotel.images} />
          </HotelHeader>
          <SectionNav locale={locale} />
        </div>
        <HotelOverview hotel={hotel} locale={locale} />
        <Section id="quartos" title={t.sections.rooms}>
          {hotel.availableRooms === 0 ? (
            <SoldOutAlert hasDates={criteria !== null} locale={locale} />
          ) : null}
          <StayEditProvider criteriaKey={criteria ? searchCriteriaToQueryString(criteria) : "none"}>
            <HotelStayBar
              criteria={criteria}
              summary={summary}
              pastDates={pastDates}
              datesForm={renderDatesForm(hotel.destination)}
            />
            <RoomsSection
              hotelId={hotel.id}
              hotelAvailableRooms={hotel.availableRooms}
              cancellationPolicy={hotel.cancellationPolicy}
              criteria={criteria}
              pastDates={pastDates}
            />
          </StayEditProvider>
        </Section>
        <LocationMap hotel={hotel} locale={locale} />
        <HotelPolicies hotel={hotel} locale={locale} />
        <Section id="avaliacoes" title={t.sections.reviews}>
          <ReviewsSection
            hotelId={hotel.id}
            rating={hotel.rating}
            reviewCount={hotel.reviewCount}
          />
        </Section>
        <Section id="similares" title={t.sections.similarIn({ destination: hotel.destination })}>
          <Suspense fallback={<SimilarHotelsSkeleton locale={locale} />}>
            <SimilarHotels
              locale={locale}
              hotelId={hotel.id}
              destination={hotel.destination}
              criteria={criteria}
            />
          </Suspense>
        </Section>
      </div>
    </HydrationBoundary>
  );
};
