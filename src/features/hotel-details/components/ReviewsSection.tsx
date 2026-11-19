"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { useOnline } from "@/shared/hooks/useOnline";
import { getTotalPages } from "@/shared/lib/pagination";
import { Alert, EmptyState, Pagination, RatingScore, Spinner, WifiOffIcon } from "@/shared/ui";
import { REVIEWS_PAGE_SIZE, reviewsQueryOptions } from "../api/reviews";
import { useFocusOnNewPage, useReviewsPage } from "../hooks/useReviewsPage";
import { reviewsRangeLabel } from "../model/reviews";
import { sectionHeadingId } from "../model/sections";
import { ReviewList } from "./ReviewList";
import { ReviewsSkeleton } from "./ReviewsSkeleton";
import { SectionBoundary } from "./SectionBoundary";

type ReviewsSectionProps = {
  hotelId: number;
  /** Nota agregada do hotel (a contagem `reviewCount` é de avaliações, não de comentários). */
  rating: number;
  reviewCount: number;
};

type ContentProps = {
  hotelId: number;
  page: number;
  pending: boolean;
  onPageChange: (page: number) => void;
};

const OfflineNotice = () => (
  <Alert
    tone="warning"
    title="Você está sem internet."
    icon={<WifiOffIcon aria-hidden="true" className="mt-0.5 size-5 shrink-0" />}
  >
    As avaliações aparecem assim que a conexão voltar.
  </Alert>
);

const ReviewsContent = ({ hotelId, page, pending, onPageChange }: ContentProps) => {
  const { data } = useSuspenseQuery(reviewsQueryOptions(hotelId, page));
  const online = useOnline();
  useFocusOnNewPage(page);

  if (data.total === 0) {
    return (
      <EmptyState
        headingLevel={3}
        title="Ainda sem comentários"
        description="Este hotel ainda não recebeu comentários de hóspedes."
      />
    );
  }

  return (
    <>
      {pending && !online ? <OfflineNotice /> : null}
      <p aria-live="polite" className="flex min-h-5 items-center gap-2 text-sm text-fg-muted">
        {pending ? (
          <>
            <Spinner />
            Atualizando avaliações…
          </>
        ) : (
          reviewsRangeLabel(page, data.total, REVIEWS_PAGE_SIZE)
        )}
      </p>
      <ReviewList reviews={data.items} busy={pending} />
      <Pagination
        page={page}
        totalPages={getTotalPages(data.total, REVIEWS_PAGE_SIZE)}
        onPageChange={onPageChange}
        className="mt-2"
      />
    </>
  );
};

/**
 * Avaliações paginadas (`useSuspenseQuery` + transition na troca de página). O h2 e a nota do hotel
 * ficam fora; loading e erro (com retry no lugar) trocam só o miolo.
 */
export const ReviewsSection = ({ hotelId, rating, reviewCount }: ReviewsSectionProps) => {
  const { page, pending, changePage } = useReviewsPage();
  return (
    <div className="flex max-w-3xl flex-col gap-4">
      <RatingScore rating={rating} reviewCount={reviewCount} />
      <SectionBoundary
        headingId={sectionHeadingId("avaliacoes")}
        errorTitle="Não foi possível carregar as avaliações."
        options={reviewsQueryOptions(hotelId, page)}
        loading={<ReviewsSkeleton />}
      >
        <ReviewsContent hotelId={hotelId} page={page} pending={pending} onPageChange={changePage} />
      </SectionBoundary>
    </div>
  );
};
