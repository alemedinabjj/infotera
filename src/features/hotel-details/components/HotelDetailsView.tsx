import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { Suspense } from "react";
import type { Locale } from "@/shared/i18n/config";
import type { SearchCriteria } from "@/shared/lib/search-params";
import {
  getFirstReviewsSnapshot,
  getHotelRoomsSnapshot,
  getHotelSnapshot,
} from "../api/catalog.cached";
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
import { StayAware } from "./StayAware";
import { StayEditProvider } from "./StayEditContext";

type HotelDetailsViewProps = {
  /** Idioma da rota (`[locale]`): vem dos params da página. */
  locale: Locale;
  hotelId: number;
  /**
   * Critérios da URL como **promessa, sem `await`** (F7c): no prerender `searchParams` nunca resolve,
   * então tudo o que espera esta promessa vira buraco (fallback) na casca. Por request resolve na hora.
   */
  criteria: Promise<SearchCriteria | null>;
  /**
   * Monta o `SearchForm` da F2 (destino fixo) com o destino do hotel e os critérios resolvidos; vem de
   * `app/` (feature não importa feature).
   */
  renderDatesForm: (destination: string, criteria: SearchCriteria | null) => ReactNode;
};

/**
 * `/hotel/[hotelId]`. Server Component: catálogo (hotel, quartos, 1ª página de avaliações) em
 * paralelo, de funções `"use cache"`, então a página é uma casca estática revalidada (PPR + ISR). O
 * que depende da estadia entra por três tipos de buraco: `HotelStayBar`, `RoomStayAction` por quarto
 * e links com critérios (`StayAware`). Hotel inexistente → `notFound()`.
 */
export const HotelDetailsView = async ({
  locale,
  hotelId,
  criteria,
  renderDatesForm,
}: HotelDetailsViewProps) => {
  const [snapshot, rooms, firstReviews] = await Promise.all([
    getHotelSnapshot(hotelId),
    getHotelRoomsSnapshot(hotelId),
    getFirstReviewsSnapshot(hotelId),
  ]);
  if (snapshot.kind === "not-found") notFound();
  const { hotel } = snapshot;
  const t = hotelDetailsMessages.get(locale);

  return (
    <div className="flex flex-col gap-8 lg:gap-12">
      <div className="flex flex-col gap-4">
        <Breadcrumb build={(c) => hotelBreadcrumb(hotel, c, locale)} criteria={criteria} />
        <HotelHeader locale={locale} hotel={hotel} rooms={rooms}>
          <Gallery locale={locale} hotelId={hotel.id} images={hotel.images} />
        </HotelHeader>
        <SectionNav locale={locale} />
      </div>
      <HotelOverview hotel={hotel} locale={locale} />
      <Section id="quartos" title={t.sections.rooms}>
        {hotel.availableRooms === 0 ? (
          <StayAware criteria={criteria}>
            {(resolved) => <SoldOutAlert hasDates={resolved !== null} locale={locale} />}
          </StayAware>
        ) : null}
        <StayEditProvider>
          <HotelStayBar
            locale={locale}
            criteria={criteria}
            renderDatesForm={(resolved) => renderDatesForm(hotel.destination, resolved)}
          />
          <RoomsSection
            locale={locale}
            hotelId={hotel.id}
            rooms={rooms}
            hotelAvailableRooms={hotel.availableRooms}
            cancellationPolicy={hotel.cancellationPolicy}
            criteria={criteria}
          />
        </StayEditProvider>
      </Section>
      <LocationMap hotel={hotel} locale={locale} />
      <HotelPolicies hotel={hotel} locale={locale} />
      <Section id="avaliacoes" title={t.sections.reviews}>
        <ReviewsSection
          locale={locale}
          hotelId={hotel.id}
          rating={hotel.rating}
          reviewCount={hotel.reviewCount}
          first={firstReviews}
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
  );
};
