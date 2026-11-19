import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { Suspense } from "react";
import { hotelRoomsQueryOptions } from "@/shared/api/queries";
import { getServerQueryClient } from "@/shared/api/server-query-client";
import { isBeforeToday, todayISO } from "@/shared/lib/dates";
import type { SearchCriteria } from "@/shared/lib/search-params";
import { describeStay } from "@/shared/lib/stay-summary";
import { loadHotel } from "../api/hotel.server";
import { reviewsQueryOptions } from "../api/reviews";
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

type HotelDetailsViewProps = {
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

  const today = todayISO();
  const summary = criteria ? describeStay(criteria, today) : null;
  const breadcrumb = hotelBreadcrumb(hotel, criteria);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <div className="flex flex-col gap-8 lg:gap-12">
        <div className="flex flex-col gap-4">
          <Breadcrumb {...breadcrumb} />
          <HotelHeader hotel={hotel} stayLabel={summary}>
            <Gallery name={hotel.name} images={hotel.images} />
          </HotelHeader>
          <SectionNav />
        </div>
        <HotelOverview hotel={hotel} />
        <Section id="quartos" title="Quartos">
          <HotelStayBar
            criteria={criteria}
            summary={summary}
            pastDates={criteria ? isBeforeToday(criteria.checkIn, today) : false}
            datesForm={renderDatesForm(hotel.destination)}
          />
          <RoomsSection
            hotelId={hotel.id}
            hotelAvailableRooms={hotel.availableRooms}
            cancellationPolicy={hotel.cancellationPolicy}
            criteria={criteria}
          />
        </Section>
        <LocationMap hotel={hotel} />
        <HotelPolicies hotel={hotel} />
        <Section id="avaliacoes" title="Avaliações">
          <ReviewsSection
            hotelId={hotel.id}
            rating={hotel.rating}
            reviewCount={hotel.reviewCount}
          />
        </Section>
        <Section id="similares" title={`Hotéis similares em ${hotel.destination}`}>
          <Suspense fallback={<SimilarHotelsSkeleton />}>
            <SimilarHotels hotelId={hotel.id} destination={hotel.destination} criteria={criteria} />
          </Suspense>
        </Section>
      </div>
    </HydrationBoundary>
  );
};
