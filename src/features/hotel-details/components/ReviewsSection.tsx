import { Suspense } from "react";
import type { Locale } from "@/shared/i18n/config";
import { EmptyState, RatingScore } from "@/shared/ui";
import type { FirstReviews } from "../api/catalog.cached";
import { hotelDetailsMessages } from "../i18n/messages";
import { ReviewsPager } from "./ReviewsPager";
import { ReviewsStatic } from "./ReviewsStatic";

type ReviewsSectionProps = {
  locale: Locale;
  hotelId: number;
  /** Nota agregada do hotel (a contagem `reviewCount` é de avaliações, não de comentários). */
  rating: number;
  reviewCount: number;
  first: FirstReviews;
};

/**
 * Avaliações. A página 1 é HTML da casca (snapshot do catálogo); o `ReviewsPager` assume dentro do
 * Suspense, com `initialData`, e cuida das páginas seguintes. O h2 fica fora.
 */
export const ReviewsSection = ({
  locale,
  hotelId,
  rating,
  reviewCount,
  first,
}: ReviewsSectionProps) => {
  const t = hotelDetailsMessages.get(locale).reviews;
  return (
    <div className="flex max-w-3xl flex-col gap-4">
      <RatingScore locale={locale} rating={rating} reviewCount={reviewCount} />
      {first.page.total === 0 ? (
        <EmptyState headingLevel={3} title={t.emptyTitle} description={t.emptyBody} />
      ) : (
        <Suspense fallback={<ReviewsStatic page={first.page} />}>
          <ReviewsPager hotelId={hotelId} initialPage={first.page} fetchedAt={first.fetchedAt} />
        </Suspense>
      )}
    </div>
  );
};
