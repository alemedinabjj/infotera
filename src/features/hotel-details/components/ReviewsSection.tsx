import { Suspense } from "react";
import type { Locale } from "@/shared/i18n/config";
import { EmptyState, RatingScore } from "@/shared/ui";
import type { FirstReviews } from "../api/catalog.cached";
import type { Settled } from "../api/settled";
import { hotelDetailsMessages } from "../i18n/messages";
import { sectionHeadingId } from "../model/sections";
import { RequestOnly } from "./RequestOnly";
import { ReviewsPager } from "./ReviewsPager";
import { ReviewsStatic } from "./ReviewsStatic";
import { SectionRefreshError } from "./SectionRefreshError";

type ReviewsSectionProps = {
  locale: Locale;
  hotelId: number;
  /** Nota agregada do hotel (a contagem `reviewCount` é de avaliações, não de comentários). */
  rating: number;
  reviewCount: number;
  first: Settled<FirstReviews>;
};

/**
 * Avaliações. A página 1 é HTML da casca (snapshot do catálogo); o `ReviewsPager` assume dentro do
 * Suspense, com `initialData`, e cuida das páginas seguintes. O h2 fica fora. Falha da 1ª página: erro
 * da seção com retry, só por request (`RequestOnly`).
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
      {first.kind === "error" ? (
        <RequestOnly>
          <SectionRefreshError headingId={sectionHeadingId("avaliacoes")} title={t.loadError} />
        </RequestOnly>
      ) : first.value.page.total === 0 ? (
        <EmptyState headingLevel={3} title={t.emptyTitle} description={t.emptyBody} />
      ) : (
        <Suspense fallback={<ReviewsStatic page={first.value.page} />}>
          <ReviewsPager
            hotelId={hotelId}
            initialPage={first.value.page}
            fetchedAt={first.value.fetchedAt}
          />
        </Suspense>
      )}
    </div>
  );
};
