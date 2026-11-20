import { HotelNotFound } from "@/features/hotel-details";
import { getLocale } from "@/shared/i18n/server";

const HotelNotFoundPage = async () => <HotelNotFound locale={await getLocale()} />;

export default HotelNotFoundPage;
