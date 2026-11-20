import type { Locale } from "@/shared/i18n/config";
import { Skeleton, Spinner } from "@/shared/ui";
import { hotelDetailsMessages } from "../i18n/messages";

type PhotoSkeletonProps = { locale: Locale; variant: "modal" | "page" };

/**
 * Carregando a rota da foto. `modal`: a moldura do Dialog `full` (fundo escuro) com `Spinner` e o
 * texto visível, como o `PhotoFrame`; um bloco claro de skeleton sobre fundo escuro seria um flash.
 * `page`: skeleton claro com a geometria final da página cheia.
 */
export const PhotoSkeleton = ({ locale, variant }: PhotoSkeletonProps) => {
  const t = hotelDetailsMessages.get(locale).gallery;
  if (variant === "modal") {
    return (
      <div className="fixed inset-0 z-50 flex h-dvh flex-col bg-fg text-fg-on-primary">
        <div className="h-14 shrink-0" />
        <div
          aria-busy="true"
          className="flex flex-1 flex-col items-center justify-center gap-2 text-sm"
        >
          <Spinner />
          <p role="status">{t.loading}</p>
        </div>
        <div className="h-16 shrink-0" />
      </div>
    );
  }
  return (
    <div aria-busy="true" className="flex flex-col gap-4 py-0">
      <p className="sr-only" aria-live="polite">
        {t.loading}
      </p>
      <Skeleton shape="block" className="h-11 w-44" />
      <Skeleton className="h-7 w-3/4" />
      <Skeleton
        shape="block"
        className="aspect-[4/3] rounded-card sm:aspect-video lg:mx-auto lg:max-w-4xl"
      />
      <div className="flex items-center justify-between lg:mx-auto lg:w-full lg:max-w-4xl">
        <Skeleton shape="block" className="size-11" />
        <Skeleton className="h-5 w-28" />
        <Skeleton shape="block" className="size-11" />
      </div>
    </div>
  );
};
