import type { Metadata } from "next";
import { FavoritesView } from "@/features/favorites";

export const metadata: Metadata = {
  title: "Favoritos | Infotera Hotéis",
  robots: { index: false },
};

/** Casca estática: a lista depende do navegador (localStorage), então vive na ilha cliente. */
const FavoritesPage = () => <FavoritesView />;

export default FavoritesPage;
