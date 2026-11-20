"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { useHydrated } from "@/shared/hooks/useHydrated";
import { useOnline } from "@/shared/hooks/useOnline";
import { useLocale } from "@/shared/i18n/client";
import { getTotalPages } from "@/shared/lib/pagination";
import { Alert, EmptyState, Pagination, Spinner, WifiOffIcon } from "@/shared/ui";
import { REVIEWS_PAGE_SIZE, type ReviewsPage, reviewsQueryOptions } from "../api/reviews";
import { useHotelDetailsMessages } from "../hooks/useHotelDetailsMessages";
import { useFocusOnNewPage, useReviewsPage } from "../hooks/useReviewsPage";
import { reviewsRangeLabel } from "../model/reviews";
import { sectionHeadingId } from "../model/sections";
import { ReviewList } from "./ReviewList";
import { ReviewsSkeleton } from "./ReviewsSkeleton";
import { SectionBoundary } from "./SectionBoundary";

type ReviewsPagerProps = {
  hotelId: number;
  /** Página 1 do snapshot do catálogo (`initialData`): a primeira página não faz request. */
  initialPage: ReviewsPage;
  /** Quando o snapshot foi buscado (`initialDataUpdatedAt`): o TanStack sabe a idade real. */
  fetchedAt: number;
};

type ContentProps = {
  hotelId: number;
  initialPage: ReviewsPage;
  fetchedAt: number;
  page: number;
  pending: boolean;
  onPageChange: (page: number) => void;
};

const OfflineNotice = () => {
  const t = useHotelDetailsMessages().reviews;
  return (
    <Alert
      tone="warning"
      title={t.offlineTitle}
      icon={<WifiOffIcon aria-hidden="true" className="mt-0.5 size-5 shrink-0" />}
    >
      {t.offlineBody}
    </Alert>
  );
};

const ReviewsContent = ({
  hotelId,
  initialPage,
  fetchedAt,
  page,
  pending,
  onPageChange,
}: ContentProps) => {
  const locale = useLocale();
  const t = useHotelDetailsMessages().reviews;
  const { data } = useSuspenseQuery({
    ...reviewsQueryOptions(hotelId, page),
    ...(page === 1 ? { initialData: initialPage, initialDataUpdatedAt: fetchedAt } : {}),
  });
  const online = useOnline();
  const hydrated = useHydrated();
  useFocusOnNewPage(page);

  if (data.total === 0) {
    return <EmptyState headingLevel={3} title={t.emptyTitle} description={t.emptyBody} />;
  }

  // Offline: só o aviso (sem spinner nem lista esmaecida: nada está carregando de fato). Ele vem
  // **depois** da paginação para não empurrar o botão que a pessoa acabou de usar.
  const loading = pending && online;
  return (
    <>
      <p aria-live="polite" className="flex min-h-5 items-center gap-2 text-sm text-fg-muted">
        {loading ? (
          <>
            <Spinner />
            {t.updating}
          </>
        ) : (
          reviewsRangeLabel(page, data.total, REVIEWS_PAGE_SIZE, locale)
        )}
      </p>
      <ReviewList reviews={data.items} busy={loading} />
      <Pagination
        locale={locale}
        page={page}
        totalPages={getTotalPages(data.total, REVIEWS_PAGE_SIZE)}
        onPageChange={onPageChange}
        disabled={!hydrated}
        className="mt-2"
      />
      {pending && !online ? <OfflineNotice /> : null}
    </>
  );
};

/**
 * Paginação das avaliações. Os botões nascem `disabled` (HTML do servidor) e só habilitam depois de
 * hidratar: o React troca o fallback pelo pager com o script inline antes do JS rodar, e um clique
 * nesse intervalo se perderia. (`useSuspenseQuery` + transition na troca de página). Cliente, dentro de
 * `<Suspense>` (o TanStack lê `Date.now()` no render, vedado na casca): a página 1 vem do snapshot do
 * catálogo e a 2+ do cliente. Loading e erro (com retry no lugar) trocam só o miolo.
 */
export const ReviewsPager = ({ hotelId, initialPage, fetchedAt }: ReviewsPagerProps) => {
  const t = useHotelDetailsMessages().reviews;
  const { page, pending, changePage, changed } = useReviewsPage();
  return (
    <SectionBoundary
      headingId={sectionHeadingId("avaliacoes")}
      errorTitle={t.loadError}
      options={reviewsQueryOptions(hotelId, page)}
      loading={<ReviewsSkeleton />}
      focusRetryOnError={changed}
    >
      <ReviewsContent
        hotelId={hotelId}
        initialPage={initialPage}
        fetchedAt={fetchedAt}
        page={page}
        pending={pending}
        onPageChange={changePage}
      />
    </SectionBoundary>
  );
};
