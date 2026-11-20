import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getHotelSnapshot,
  PhotoNotFound,
  PhotoPage,
  parseHotelId,
  parsePhotoParam,
  photoPageTitle,
} from "@/features/hotel-details";
import { localeOf } from "@/shared/i18n/params";

type PhotoRouteProps = PageProps<"/[locale]/hotel/[hotelId]/photos/[photo]">;

export const generateMetadata = async ({ params }: PhotoRouteProps): Promise<Metadata> => {
  const [{ hotelId, photo }, locale] = await Promise.all([params, localeOf(params)]);
  const id = parseHotelId(hotelId);
  const snapshot = id === null ? null : await getHotelSnapshot(id);
  if (snapshot?.kind !== "found") return { title: photoPageTitle({ kind: "not-found" }, locale) };
  const index = parsePhotoParam(photo, snapshot.hotel.images.length);
  return {
    robots: { index: false },
    title:
      index === null
        ? photoPageTitle({ kind: "not-found" }, locale)
        : photoPageTitle(
            {
              kind: "photo",
              hotel: snapshot.hotel.name,
              index,
              total: snapshot.hotel.images.length,
            },
            locale,
          ),
  };
};

/**
 * Página cheia da foto (`/hotel/{id}/photos/{n}`, 1-based): aberta por URL, reload ou link
 * compartilhado. Hotel inexistente → "Hotel não encontrado"; foto fora de `1..total` → "Foto não
 * encontrada" com link para o hotel.
 */
const PhotoRoute = async ({ params }: PhotoRouteProps) => {
  const [{ hotelId: rawId, photo }, locale] = await Promise.all([params, localeOf(params)]);
  const hotelId = parseHotelId(rawId);
  if (hotelId === null) notFound();
  const snapshot = await getHotelSnapshot(hotelId);
  if (snapshot.kind === "not-found") notFound();
  const index = parsePhotoParam(photo, snapshot.hotel.images.length);
  if (index === null) {
    return <PhotoNotFound locale={locale} hotelId={hotelId} hotelName={snapshot.hotel.name} />;
  }
  return <PhotoPage locale={locale} hotel={snapshot.hotel} index={index} />;
};

export default PhotoRoute;
