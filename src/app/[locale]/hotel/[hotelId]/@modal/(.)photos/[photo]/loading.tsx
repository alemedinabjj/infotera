import { PhotoSkeleton } from "@/features/hotel-details";
import { getLocale } from "@/shared/i18n/server";

/** Moldura do modal aberta na hora, com spinner e "Carregando foto…". */
const PhotoModalLoading = async () => <PhotoSkeleton locale={await getLocale()} variant="modal" />;

export default PhotoModalLoading;
