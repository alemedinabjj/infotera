import type { Metadata } from "next";
import { FavoritesView, favoritesMessages } from "@/features/favorites";
import { localeOf } from "@/shared/i18n/params";

export const generateMetadata = async ({
  params,
}: PageProps<"/[locale]/favorites">): Promise<Metadata> => {
  const locale = await localeOf(params);
  return {
    title: favoritesMessages.get(locale).metaTitle,
    robots: { index: false },
  };
};

/** Casca estática: a lista depende do navegador (localStorage), então vive na ilha cliente. */
const FavoritesPage = () => <FavoritesView />;

export default FavoritesPage;
