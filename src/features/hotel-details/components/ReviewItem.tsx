import type { Review } from "@/shared/api/schemas";
import { useLocale } from "@/shared/i18n/client";
import { contentLang } from "@/shared/i18n/config";
import { formatDate } from "@/shared/lib/dates";
import { Badge, CheckIcon, RatingScore } from "@/shared/ui";
import { useHotelDetailsMessages } from "../hooks/useHotelDetailsMessages";
import { helpfulLabel } from "../model/reviews";
import { ReviewAvatar } from "./ReviewAvatar";

/** Um comentário: autor, data, selo de verificado, nota inteira em texto, título e texto. */
export const ReviewItem = ({ review }: { review: Review }) => {
  const locale = useLocale();
  const t = useHotelDetailsMessages().reviews;
  const helpful = helpfulLabel(review.helpful, locale);
  return (
    <li>
      <article className="flex flex-col gap-2 py-5">
        <div className="flex items-start gap-3">
          <ReviewAvatar name={review.guestName} src={review.guestAvatar} />
          <div className="flex min-w-0 flex-1 flex-wrap items-start justify-between gap-x-3 gap-y-1">
            <div className="flex flex-col">
              <p className="font-medium text-fg">{review.guestName}</p>
              <time dateTime={review.date} className="text-sm text-fg-subtle tabular-nums">
                {formatDate(review.date, "short", locale)}
              </time>
            </div>
            {review.verified ? (
              <Badge tone="success" icon={<CheckIcon aria-hidden="true" className="size-3" />}>
                {t.verified}
              </Badge>
            ) : null}
          </div>
        </div>
        <RatingScore locale={locale} rating={review.rating} size="sm" />
        <h3 lang={contentLang(locale)} className="text-base font-semibold text-fg">
          {review.title}
        </h3>
        <p lang={contentLang(locale)} className="max-w-prose text-fg">
          {review.comment}
        </p>
        {helpful ? <p className="text-sm text-fg-subtle">{helpful}</p> : null}
      </article>
    </li>
  );
};
