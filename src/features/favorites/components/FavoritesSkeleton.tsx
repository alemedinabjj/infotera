import { Skeleton } from "@/shared/ui";
import { FAVORITES_MESSAGES } from "../model/messages";

const MAX_SKELETONS = 6;

/** Skeleton com a geometria do card vertical. N = favoritos (no máximo 6). */
export const FavoritesSkeleton = ({ count, slow }: { count: number; slow: boolean }) => {
  const total = Math.min(Math.max(count, 1), MAX_SKELETONS);
  return (
    <div aria-busy="true" className="flex flex-col gap-4">
      <p aria-live="polite" className="text-sm text-fg-muted">
        {slow ? FAVORITES_MESSAGES.slow : FAVORITES_MESSAGES.loading}
      </p>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
        {Array.from({ length: total }, (_, index) => `sk-${index}`).map((key) => (
          <li
            key={key}
            className="flex flex-col overflow-hidden rounded-card border border-border bg-surface"
          >
            <Skeleton shape="block" className="aspect-[4/3] rounded-none" />
            <div className="flex flex-col gap-2 p-3 sm:p-4">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-5 w-1/2" />
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-7 w-28" />
              <div className="flex min-h-11 items-center">
                <Skeleton className="h-6 w-28" />
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};
