import type { Metadata } from "next";
import { BookingHistoryView, historyMessages } from "@/features/booking-history";
import { isLocale } from "@/shared/i18n/config";

export const generateMetadata = async ({
  params,
}: PageProps<"/[locale]/my-bookings">): Promise<Metadata> => {
  const { locale } = await params;
  return {
    title: isLocale(locale) ? historyMessages.get(locale).metaTitle : undefined,
    robots: { index: false },
  };
};

/** Casca estática: o histórico depende do navegador (localStorage) e a reserva tem PII. */
const MyBookingsPage = () => <BookingHistoryView />;

export default MyBookingsPage;
