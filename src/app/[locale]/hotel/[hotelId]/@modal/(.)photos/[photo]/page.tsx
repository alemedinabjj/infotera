import {
  getHotelSnapshot,
  PhotoModal,
  parseHotelId,
  parsePhotoParam,
} from "@/features/hotel-details";

/**
 * Galeria interceptada: abre como modal sobre a página do hotel. Índice inválido ou hotel
 * inexistente → `null` (o modal não abre; a página por trás fica como estava).
 */
const PhotoModalRoute = async ({
  params,
}: PageProps<"/[locale]/hotel/[hotelId]/photos/[photo]">) => {
  const { hotelId: rawId, photo } = await params;
  const hotelId = parseHotelId(rawId);
  if (hotelId === null) return null;
  const snapshot = await getHotelSnapshot(hotelId);
  if (snapshot.kind === "not-found") return null;
  const index = parsePhotoParam(photo, snapshot.hotel.images.length);
  if (index === null) return null;
  return (
    <PhotoModal
      hotelId={hotelId}
      name={snapshot.hotel.name}
      images={snapshot.hotel.images}
      initialIndex={index}
    />
  );
};

export default PhotoModalRoute;
