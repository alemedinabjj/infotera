import type { Metadata } from "next";
import { appShellMessages, OfflinePage } from "@/features/app-shell";
import { isLocale } from "@/shared/i18n/config";

export const generateMetadata = async ({
  params,
}: PageProps<"/[locale]/offline/bookings">): Promise<Metadata> => {
  const { locale } = await params;
  return {
    title: isLocale(locale)
      ? appShellMessages.get(locale).offlinePage.bookings.metaTitle
      : undefined,
    robots: { index: false },
  };
};

/** Página offline (bookings) do idioma: estática, pré-cacheada pelo service worker. */
const OfflineRoute = () => <OfflinePage variant="bookings" />;

export default OfflineRoute;
