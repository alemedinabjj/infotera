import type { Metadata } from "next";
import { appShellMessages, OfflinePage } from "@/features/app-shell";
import { isLocale } from "@/shared/i18n/config";

export const generateMetadata = async ({
  params,
}: PageProps<"/[locale]/offline">): Promise<Metadata> => {
  const { locale } = await params;
  return {
    title: isLocale(locale) ? appShellMessages.get(locale).offlinePage.public.metaTitle : undefined,
    robots: { index: false },
  };
};

/** Página offline (public) do idioma: estática, pré-cacheada pelo service worker. */
const OfflineRoute = () => <OfflinePage variant="public" />;

export default OfflineRoute;
