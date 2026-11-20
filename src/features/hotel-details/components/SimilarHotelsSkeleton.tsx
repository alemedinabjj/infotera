import type { Locale } from "@/shared/i18n/config";
import { Skeleton } from "@/shared/ui";
import { hotelDetailsMessages } from "../i18n/messages";

const KEYS = ["a", "b", "c", "d"] as const;

/** Esqueleto dos similares (4 cards): horizontal no celular, vertical a partir de `sm`. */
export const SimilarHotelsSkeleton = ({ locale }: { locale: Locale }) => (
  <div aria-busy="true">
    <p className="sr-only" aria-live="polite">
      {hotelDetailsMessages.get(locale).loading.similar}
    </p>
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
      {KEYS.map((key) => (
        <li
          key={key}
          className="flex flex-row overflow-hidden rounded-card border border-border bg-surface shadow-card sm:flex-col"
        >
          <Skeleton
            shape="block"
            className="size-24 shrink-0 rounded-none sm:aspect-[4/3] sm:size-auto"
          />
          <div className="flex flex-1 flex-col gap-1 p-3 sm:p-4">
            <Skeleton className="h-5" />
            <Skeleton className="h-5 w-3/4 sm:h-6" />
            <Skeleton className="h-5 w-2/3" />
          </div>
        </li>
      ))}
    </ul>
  </div>
);
