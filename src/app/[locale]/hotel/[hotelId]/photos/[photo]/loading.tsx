import { PhotoSkeleton } from "@/features/hotel-details";
import { getLocale } from "@/shared/i18n/server";

/** Skeleton claro da página cheia da foto (geometria final). */
const PhotoLoading = async () => <PhotoSkeleton locale={await getLocale()} variant="page" />;

export default PhotoLoading;
