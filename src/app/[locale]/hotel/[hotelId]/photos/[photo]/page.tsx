import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getHotelSnapshot,
  listPrerenderPhotoParams,
  PhotoPage,
  parseHotelId,
  parsePhotoParam,
  photoPageTitle,
} from "@/features/hotel-details";
import { localeOf } from "@/shared/i18n/params";

/**
 * Toda foto de todo hotel vira HTML no build: com os params conhecidos, h1 e foto já estão no HTML
 * (inclusive sem JavaScript), sem fallback de Suspense para trocar. Fora da faixa (`/photos/0`) é 404.
 */
export const generateStaticParams = () => listPrerenderPhotoParams();

/**
 * Modo blocking de propósito: o `await params` fica fora de `<Suspense>`, então uma foto que o build
 * não gerou espera a página completa na primeira visita (e o Next guarda o resultado).
 */
export const instant = false;

type PhotoRouteProps = PageProps<"/[locale]/hotel/[hotelId]/photos/[photo]">;

export const generateMetadata = async ({ params }: PhotoRouteProps): Promise<Metadata> => {
  const [{ hotelId, photo }, locale] = await Promise.all([params, localeOf(params)]);
  const notFoundTitle = photoPageTitle({ kind: "not-found" }, locale);
  const id = parseHotelId(hotelId);
  if (id === null) return { title: notFoundTitle };
  try {
    const snapshot = await getHotelSnapshot(id);
    if (snapshot.kind !== "found") return { title: notFoundTitle };
    const total = snapshot.hotel.images.length;
    const index = parsePhotoParam(photo, total);
    if (index === null) return { title: notFoundTitle };
    return {
      robots: { index: false },
      title: photoPageTitle({ kind: "photo", hotel: snapshot.hotel.name, index, total }, locale),
    };
  } catch {
    // Metadata nunca derruba a página: o erro real aparece (com retry) no `error.tsx`.
    return { title: photoPageTitle({ kind: "not-found" }, locale) };
  }
};

/**
 * Página cheia da foto (`/hotel/{id}/photos/{n}`, 1-based): aberta por URL, reload ou link
 * compartilhado. Hotel inexistente ou foto fora de `1..total` → `notFound()` (404 com "Foto não
 * encontrada" e link para o hotel). O `await params` fica **fora** de `<Suspense>`: a primeira visita
 * a uma foto ainda não gerada espera a página completa (modo blocking), e o HTML já traz h1 e foto,
 * sem depender de JS para trocar um fallback.
 */
const PhotoRoute = async ({ params }: PhotoRouteProps) => {
  const [{ hotelId: rawId, photo }, locale] = await Promise.all([params, localeOf(params)]);
  const hotelId = parseHotelId(rawId);
  if (hotelId === null) notFound();
  const snapshot = await getHotelSnapshot(hotelId);
  if (snapshot.kind === "not-found") notFound();
  const index = parsePhotoParam(photo, snapshot.hotel.images.length);
  if (index === null) notFound();
  return <PhotoPage locale={locale} hotel={snapshot.hotel} index={index} />;
};

export default PhotoRoute;
