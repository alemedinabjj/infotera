import type { Metadata } from "next";
import { BookingHistoryView, historyMessages } from "@/features/booking-history";
import { localeOf } from "@/shared/i18n/params";

export const generateMetadata = async ({
  params,
}: PageProps<"/[locale]/my-bookings">): Promise<Metadata> => {
  const locale = await localeOf(params);
  return {
    title: historyMessages.get(locale).metaTitle,
    robots: { index: false },
  };
};

/** Casca estática: o histórico depende do navegador (localStorage) e a reserva tem PII. */
const MyBookingsPage = () => <BookingHistoryView />;

export default MyBookingsPage;
