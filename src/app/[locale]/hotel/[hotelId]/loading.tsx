import { HotelDetailsSkeleton } from "@/features/hotel-details";
import { getLocale } from "@/shared/i18n/server";

/** Skeleton imediato ao abrir o hotel (cobre o cold start da API). */
const HotelLoading = async () => <HotelDetailsSkeleton locale={await getLocale()} />;

export default HotelLoading;
