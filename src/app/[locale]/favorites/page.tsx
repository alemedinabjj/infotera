import type { Metadata } from "next";
import { FavoritesView, favoritesMessages } from "@/features/favorites";
import { isLocale } from "@/shared/i18n/config";

export const generateMetadata = async ({
  params,
}: PageProps<"/[locale]/favorites">): Promise<Metadata> => {
  const { locale } = await params;
  return {
    title: isLocale(locale) ? favoritesMessages.get(locale).metaTitle : undefined,
    robots: { index: false },
  };
};

/** Casca estática: a lista depende do navegador (localStorage), então vive na ilha cliente. */
const FavoritesPage = () => <FavoritesView />;

export default FavoritesPage;
