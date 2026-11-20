import type { Locale } from "@/shared/i18n/config";
import { cardClassName, Skeleton } from "@/shared/ui";
import { confirmationMessages } from "../i18n/messages";
import { StayDetailsSkeleton } from "./StayDetailsSkeleton";

const CARD = cardClassName({ className: "gap-4 p-4 md:p-5" });

/**
 * Skeleton da rota (`loading.tsx`), com a geometria da página. O aviso "está demorando" é CSS puro
 * (`animate-slow-notice`, 5 s): aparece sem hidratação, como no skeleton do hotel.
 */
export const ConfirmationSkeleton = ({ locale }: { locale: Locale }) => {
  const t = confirmationMessages.get(locale);
  return (
    <div aria-busy="true" className="flex w-full max-w-3xl flex-col gap-6 lg:gap-8">
      <div role="status" className="flex flex-col">
        <p className="sr-only">{t.loading}</p>
        <p className="invisible min-h-5 animate-slow-notice text-sm text-fg-muted print:hidden">
          {t.slow}
        </p>
      </div>
      <div className="flex flex-col items-start gap-3">
        <Skeleton shape="circle" className="size-12" />
        <Skeleton className="h-8 w-64 lg:h-9" />
        <Skeleton className="h-6 w-full max-w-sm" />
        <Skeleton className="h-5 w-56" />
      </div>
      <div className={cardClassName({ className: "p-4 md:p-5" })}>
        <Skeleton className="h-5 w-36" />
        <Skeleton className="mt-1 h-7 w-full sm:w-96" />
        <Skeleton className="mt-1 h-7 w-40 sm:hidden" />
        <Skeleton shape="block" className="mt-3 h-11 w-full sm:w-64" />
        <div className="mt-2 min-h-5" />
        <div className="mt-2 grid gap-4 border-t border-border pt-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-6 w-40" />
          </div>
          <div className="flex flex-col gap-2">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-8 w-36" />
          </div>
        </div>
      </div>
      <div className={CARD}>
        <Skeleton className="h-7 w-32" />
        <StayDetailsSkeleton locale={locale} announce={false} />
      </div>
      <div className={CARD}>
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-full" />
      </div>
    </div>
  );
};
