import type { Review } from "@/shared/api/schemas";
import { cn } from "@/shared/lib/cn";
import { ReviewItem } from "./ReviewItem";

type ReviewListProps = {
  reviews: readonly Review[];
  /** Próxima página a caminho: a lista atual esmaece (e segue visível). */
  busy: boolean;
};

export const ReviewList = ({ reviews, busy }: ReviewListProps) => (
  <ul
    aria-busy={busy}
    className={cn("divide-y divide-border transition-opacity duration-150", busy && "opacity-60")}
  >
    {reviews.map((review) => (
      <ReviewItem key={review.id} review={review} />
    ))}
  </ul>
);
