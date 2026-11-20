import { HotelDetailsSkeleton } from "@/features/hotel-details";

/** Skeleton imediato ao abrir o hotel (cobre o cold start da API). */
const HotelLoading = () => <HotelDetailsSkeleton />;

export default HotelLoading;
