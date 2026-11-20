"use client";

import { useLocale } from "@/shared/i18n/client";
import { getTotalPages } from "@/shared/lib/pagination";
import { Pagination } from "@/shared/ui";
import { REVIEWS_PAGE_SIZE, type ReviewsPage } from "../api/reviews";
import { reviewsRangeLabel } from "../model/reviews";
import { ReviewList } from "./ReviewList";

const ignore = (): void => undefined;

/**
 * 1ª página de comentários, sem TanStack: é o fallback do `ReviewsPager` e o que vai na casca
 * estática. Mesma lista, legenda e paginação do pager, então a troca não mexe em nada; a paginação
 * fica desabilitada (antes de hidratar, clicar não faria nada) e o pager a habilita.
 */
export const ReviewsStatic = ({ page }: { page: ReviewsPage }) => {
  const locale = useLocale();
  return (
    <>
      <p className="flex min-h-5 items-center gap-2 text-sm text-fg-muted">
        {reviewsRangeLabel(1, page.total, REVIEWS_PAGE_SIZE, locale)}
      </p>
      <ReviewList reviews={page.items} busy={false} />
      <Pagination
        locale={locale}
        page={1}
        totalPages={getTotalPages(page.total, REVIEWS_PAGE_SIZE)}
        onPageChange={ignore}
        disabled
        className="mt-2"
      />
    </>
  );
};
