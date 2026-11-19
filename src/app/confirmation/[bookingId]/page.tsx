import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import {
  BookingConfirmation,
  generateConfirmationMetadata,
  parseBookingId,
} from "@/features/booking-confirmation";

export const generateMetadata = async ({
  params,
}: PageProps<"/confirmation/[bookingId]">): Promise<Metadata> =>
  generateConfirmationMetadata((await params).bookingId);

/**
 * `/confirmation/[bookingId]`. Sempre dinâmica (`connection()`): a página tem nome, e-mail e
 * reserva e nunca pode entrar em cache de rota. O id é validado antes de qualquer request: o que
 * não é UUID v4 nem id curto do json-server (nunca só dígitos) vira "não encontrada" sem chamar a API.
 */
const ConfirmationPage = async ({ params }: PageProps<"/confirmation/[bookingId]">) => {
  await connection();
  const id = parseBookingId((await params).bookingId);
  if (id === null) notFound();
  return <BookingConfirmation id={id} />;
};

export default ConfirmationPage;
