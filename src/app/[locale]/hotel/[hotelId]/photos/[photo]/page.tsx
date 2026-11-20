import type { Metadata } from "next";
import {
  getHotelSnapshot,
  HotelNotFound,
  hotelPageTitle,
  listPrerenderPhotoParams,
  PhotoNotFoundView,
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

const NO_INDEX = { index: false } as const;

type PhotoRouteProps = PageProps<"/[locale]/hotel/[hotelId]/photos/[photo]">;

export const generateMetadata = async ({ params }: PhotoRouteProps): Promise<Metadata> => {
  const [{ hotelId, photo }, locale] = await Promise.all([params, localeOf(params)]);
  const hotelMissing = { title: hotelPageTitle({ kind: "not-found" }, locale), robots: NO_INDEX };
  const photoMissing = { title: photoPageTitle({ kind: "not-found" }, locale), robots: NO_INDEX };
  const id = parseHotelId(hotelId);
  if (id === null) return hotelMissing;
  try {
    const snapshot = await getHotelSnapshot(id);
    if (snapshot.kind !== "found") return hotelMissing;
    const total = snapshot.hotel.images.length;
    const index = parsePhotoParam(photo, total);
    if (index === null) return photoMissing;
    return {
      robots: { index: false },
      title: photoPageTitle({ kind: "photo", hotel: snapshot.hotel.name, index, total }, locale),
    };
  } catch {
    // Metadata nunca derruba a página: o erro real aparece (com retry) no `error.tsx`.
    return photoMissing;
  }
};

/**
 * Página cheia da foto (`/hotel/{id}/photos/{n}`, 1-based): aberta por URL, reload ou link
 * compartilhado. Hotel inexistente → "Hotel não encontrado" (F4); foto fora de `1..total` → "Foto não
 * encontrada" com link para o hotel. O `await params` fica **fora** de `<Suspense>`: a primeira visita
 * a uma foto ainda não gerada espera a página completa (modo blocking), e o HTML já traz h1 e foto,
 * sem depender de JS para trocar um fallback.
 */
const PhotoRoute = async ({ params }: PhotoRouteProps) => {
  const [{ hotelId: rawId, photo }, locale] = await Promise.all([params, localeOf(params)]);
  const hotelId = parseHotelId(rawId);
  // "Não encontrado" inline (`200` + `noindex`), não `notFound()`: com `cacheComponents` o Next responde
  // todo `notFound()` com HTML vazio (`__next_error__`), e a página ficaria em branco sem JavaScript.
  if (hotelId === null) return <HotelNotFound locale={locale} />;
  const snapshot = await getHotelSnapshot(hotelId);
  if (snapshot.kind === "not-found") return <HotelNotFound locale={locale} />;
  const index = parsePhotoParam(photo, snapshot.hotel.images.length);
  if (index === null) return <PhotoNotFoundView locale={locale} hotelId={hotelId} />;
  return <PhotoPage locale={locale} hotel={snapshot.hotel} index={index} />;
};

export default PhotoRoute;
