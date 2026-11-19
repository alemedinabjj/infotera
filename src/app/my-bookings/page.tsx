import type { Metadata } from "next";
import { BookingHistoryView } from "@/features/booking-history";

export const metadata: Metadata = {
  title: "Minhas reservas | Infotera Hotéis",
  robots: { index: false },
};

/** Casca estática: o histórico depende do navegador (localStorage) e a reserva tem PII. */
const MyBookingsPage = () => <BookingHistoryView />;

export default MyBookingsPage;
